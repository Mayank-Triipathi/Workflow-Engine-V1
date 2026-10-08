const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function initializeDatabase(config) {
    // First connect to MySQL server without selecting a database
    const connection = await mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port || 3306
    });

    // Create database if it doesn't exist
    await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${config.database}\``
    );

    await connection.end();

    // Now create the actual pool
    const db = mysql.createPool(config);

    // Read init.sql
    const initPath = path.join(__dirname, "init.sql");
    const sql = fs.readFileSync(initPath, "utf8");

    // Execute schema
    await db.query(sql);

    return db;
}

module.exports = { initializeDatabase };