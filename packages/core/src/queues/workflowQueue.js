const { Queue } = require("bullmq");

const createQueue = (redis) => {

    const queue = new Queue("workflowQueue", {
        connection: redis
    });

    return {
        async enqueueWorkflow(workflow_instance_id) {

            for (let i = 0; i < 3; i++) {

                try {
                    await queue.add("workflowQueue", {
                        workflow_instance_id
                    });

                    return;
                }  catch (err) {

                    if (i === 2) {
                        throw err;
                    }

                    await new Promise(resolve =>
                        setTimeout(resolve, 1000)
                    );
                }
            }
        },

        async close() {
            await queue.close();
        }

    };
};

module.exports = { createQueue };