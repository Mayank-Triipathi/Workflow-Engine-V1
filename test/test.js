const workflowengine = require('../packages/core/src/index');
const dotenv = require('dotenv');
dotenv.config();
const { db } = require('./mysql');
const { redis } = require('./redis');
const { executors } = require('./executor');
console.log("MYSQL_PASSWORD =", process.env.MYSQL_PASSWORD);
console.log("redis host =", process.env.REDIS_HOST);
const engine = new workflowengine({ db, redis, executors, port: 8000 });
async function main() {
    try {
        await engine.start();

        console.log("✅ Workflow Engine started");
        console.log(engine.status());

        for (let i = 0; i < 100; i++) {
            await engine.trigger("Basic Success", {
                userId: i
            });
        }
    } catch (err) {
        console.error(err);
    }
}

main();