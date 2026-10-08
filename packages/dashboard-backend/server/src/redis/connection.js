const IORedis = require("ioredis");

const connection = new IORedis({
  host: "redis",
  port: 6379,
});

module.exports = { connection };