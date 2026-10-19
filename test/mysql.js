const mysql = require("mysql2/promise");

const host = process.env.MYSQL_HOST || "localhost";
const user = process.env.MYSQL_USER || "root";
const password = process.env.MYSQL_PASSWORD;
const database = process.env.MYSQL_DATABASE || "workflow_engine_test";
const port = process.env.MYSQL_PORT || 3306;

console.log({
  host,
  user,
  password,
  database,
  port,
});

const dbConfig = {
  host,
  user,
  password,
  database,
  port,
};

const db = mysql.createPool(dbConfig);
module.exports = { db, dbConfig };