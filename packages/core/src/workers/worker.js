const { Worker } = require("bullmq");
const QUEUE_NAME = "workflowQueue";

const createWorker = async ({ redis, executeWorkflow, concurrency }) => {
    const worker = new Worker(
        QUEUE_NAME,
        async (job) => {
            const { workflow_instance_id } = job.data;

            console.log("Processing:", workflow_instance_id);

            try {
                await executeWorkflow(workflow_instance_id);
            } catch (err) {
                console.error("Execution error:", err);
                throw err;
            }
        },
        {
            connection: redis,
            concurrency: concurrency
        }
    );

    await worker.waitUntilReady();

    worker.on("completed", (job) => {
        console.log("Job completed:", job.id);
    });

    worker.on("failed", (job, err) => {
        console.error("Job failed:", err);
    });

    worker.on("error", (err) => {
        console.error("Worker error:", err);
    });

    return worker;
}

module.exports = { createWorker };