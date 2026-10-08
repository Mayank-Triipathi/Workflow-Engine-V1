const Redis = require("ioredis");

const host = process.env.redis_host || "redis";
const port = process.env.redis_port || 6379;

const connection = new Redis({
  host: host,
  port: port,
  maxRetriesPerRequest: null
});

connection.on("connect", () => {
  console.log("✅ Connected to Redis");
});

module.exports = {connection};