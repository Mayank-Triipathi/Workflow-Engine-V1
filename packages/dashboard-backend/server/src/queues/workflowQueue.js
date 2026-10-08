const { Queue } = require("bullmq");
const { connection } = require("../redis/connection");

const workflowQueue = new Queue("workflowQueue", {
  connection
});

module.exports = { workflowQueue };