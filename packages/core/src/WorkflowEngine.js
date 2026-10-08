const { createQueue } = require('./queues/workflowQueue');
const { createWorker } = require('./workers/worker');
const { resumeWorkflows } = require('./recovery/resumeWorkflows');
const { createWorkflowExecutor } = require('./services/workflowExecutor');
const { createWorkflowRepo } = require('./repositories/workflowRepositories');
const { createStepRepo } = require('./repositories/stepExecutionRepository');
const { createDashboard } = require('../../dashboard-backend/server/src/server')

class WorkflowEngine {
    constructor({ db, redis, executors = {}, worker = {}, retry = {}, port = 8000, frontendPort = 5173 }) {
        if (!db) {
            throw new Error("Database connection required");
        }
        if (!redis) {
            throw new Error("Redis connection required");
        }
        this.db = db;
        this.redis = redis;

        this.workflowRepo = createWorkflowRepo(db);
        this.stepRepo = createStepRepo(db);

        this.queue = null;
        this.executors = executors;

        this.config = {
            worker: {
                concurrency: worker.concurrency ?? 5
            },

            retry: {
                maxAttempts: retry.maxAttempts ?? 3
            }
        };

        this.worker = null;

        this.dashboard = createDashboard({
            db: this.db,
            port,
            frontendPort
        });
    }

    async start() {

        if (this.worker) {
            throw new Error("Workflow Engine is already running.");
        }

        this.queue = createQueue({
            redis: this.redis
        });

        this.workflowExecutor = createWorkflowExecutor({
            workflowRepo: this.workflowRepo,
            stepRepo: this.stepRepo,
            queue: this.queue,
            executors: this.executors,
            retry: this.config.retry
        });

        this.worker = await createWorker({
            redis: this.redis,
            executeWorkflow: this.workflowExecutor.executeWorkflow,
            concurrency: this.config.worker.concurrency,
        });

        await this.dashboard.start();

        await resumeWorkflows({
            workflowRepo: this.workflowRepo,
            queue: this.queue
        });

        setTimeout(async () => {
            await resumeWorkflows({
                workflowRepo: this.workflowRepo,
                queue: this.queue
            });
            console.log("Resumed workflows after 100 seconds");
        }, 100000);

        console.log("Workflow Engine started");
    }

    async stop() {
        if (!this.worker) {
            return;
        }

        if (this.worker) {
            await this.worker.close();
            console.log("Workflow Engine stopped");
        }
        if (this.queue) {
            await this.queue.close();
            console.log("Queue closed");
        }
        if (this.dashboard) {
            await this.dashboard.close();
            console.log("Dashboard closed");
        }

        this.worker = null;
        this.queue = null;
    };

    status() {
        return {
            worker: !!this.worker,
            queue: !!this.queue,
            workerConcurrency: this.config.worker.concurrency,
            retryMaxAttempts: this.config.retry.maxAttempts
        };
    }

    async trigger(workflowName, input) {

        if (!this.worker || !this.queue) {
            throw new Error("Workflow Engine is not running. Please start the engine before triggering workflows.");
        }

        const workflow = await this.workflowRepo.getByName(workflowName);

        if (!workflow) {
            throw new Error(`Workflow "${workflowName}" not found.`);
        }

        const connection = await this.db.getConnection();

        try {

            await connection.beginTransaction();

            const workflowInstance =
                await this.workflowRepo.createInstance(
                    connection,
                    workflow.id
                );

            await this.stepRepo.createInitialInput(
                connection,
                workflowInstance.id,
                input
            );

            await connection.commit();

            await this.queue.enqueueWorkflow(workflowInstance.id);

            return {
                id: workflowInstance.id,
                status: "pending"
            };

        } catch (err) {

            await connection.rollback();
            throw err;

        } finally {

            connection.release();

        }

    }
}

module.exports = WorkflowEngine;