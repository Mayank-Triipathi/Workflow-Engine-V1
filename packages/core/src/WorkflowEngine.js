const { createQueue } = require('./queues/workflowQueue');
const { createWorker } = require('./workers/worker');
const { resumeWorkflows } = require('./recovery/resumeWorkflows');
const { createWorkflowExecutor } = require('./services/workflowExecutor');
const { createWorkflowRepo } = require('./repositories/workflowRepositories');
const { createStepRepo } = require('./repositories/stepExecutionRepository');
const { createDashboard } = require('../../dashboard-backend/server/src/server')

const mysql = require("mysql2/promise");
const { initializeDatabase } = require("./db/mysql");

class WorkflowEngine {
    constructor({ dbConfig, redis, executors = {}, worker = {}, retry = {}, port = 8000, frontendPort = 5173 }) {
        if (!dbConfig) {
            throw new Error("Database configuration required");
        }
        this.dbConfig = dbConfig;
        if (!redis) {
            throw new Error("Redis connection required");
        }
        this.db = mysql.createPool(this.dbConfig);
        this.redis = redis;

        this.workflowRepo = createWorkflowRepo(this.db);
        this.stepRepo = createStepRepo(this.db);

        this.queue = null;
        this.executors = executors;
        this.recoveryTimer = null;

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

        try {
            await initializeDatabase(this.dbConfig, this.db);

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
                concurrency: this.config.worker.concurrency
            });

            await this.dashboard.start();

            await resumeWorkflows({
                workflowRepo: this.workflowRepo,
                queue: this.queue
            });
            
            console.log("Scheduling recovery of workflows that were in progress before the engine started (in 100 seconds)...");
            this.recoveryTimer = setTimeout(async () => {
                try {
                    if (!this.worker || !this.queue) return;
                    console.log("Performing delayed recovery of workflows...");
                    await resumeWorkflows({
                        workflowRepo: this.workflowRepo,
                        queue: this.queue
                    });
                } catch (err) {
                    console.error("Delayed recovery failed:", err);
                }
            }, 100000);

            console.log("Workflow Engine started");
        } catch (err) {
            // Clean up anything that started successfully.
            if (this.worker) {
                await this.worker.close().catch(() => { });
                this.worker = null;
            }

            if (this.queue) {
                await this.queue.close().catch(() => { });
                this.queue = null;
            }

            if (this.dashboard) {
                await this.dashboard.close().catch(() => { });
            }

            throw err;
        }
    }


    async stop() {

        if (this.recoveryTimer) {
            clearTimeout(this.recoveryTimer);
            this.recoveryTimer = null;
        }
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
            console.log("Workflow Engine stopped");
        }

        if (this.queue) {
            await this.queue.close();
            this.queue = null;
            console.log("Queue closed");
        }

        if (this.dashboard) {
            await this.dashboard.close();
            console.log("Dashboard closed");
        }
    }

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