
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

async function initializeDatabase(config, db) {
    // Connect without selecting a database
    const connection = await mysql.createConnection({
        host: config.host,
        user: config.user,
        password: config.password,
        port: config.port || 3306
    });

    try {
        const database = config.database;

        if (!database || !/^[a-zA-Z0-9_$-]+$/.test(database)) {
            throw new Error("Invalid MySQL database name");
        }

        await connection.query(
            `CREATE DATABASE IF NOT EXISTS \`${database}\``
        );
    } finally {
        await connection.end();
    }

    // Read init.sql and execute table creation statements
    const initPath = path.join(__dirname, "init.sql");
    const sql = fs.readFileSync(initPath, "utf8");

    // Remove SQL comments before splitting statements
    const statements = sql
        .replace(/--.*$/gm, "")
        .split(";")
        .map(statement => statement.trim())
        .filter(Boolean);

    for (const statement of statements) {
        // Standalone indexes are handled separately below
        if (/^CREATE\s+INDEX\b/i.test(statement)) {
            continue;
        }

        await db.query(statement);
    }

    // Create an index only if it doesn't already exist
    async function createIndexIfMissing(indexName, tableName, columns) {
        const [rows] = await db.query(
            `SELECT INDEX_NAME
             FROM information_schema.statistics
             WHERE table_schema = ?
               AND table_name = ?
               AND index_name = ?`,
            [config.database, tableName, indexName]
        );

        if (rows.length === 0) {
            await db.query(
                `CREATE INDEX \`${indexName}\`
                 ON \`${tableName}\` (${columns})`
            );
        }
    }

    await createIndexIfMissing(
        "idx_steps_workflow_order",
        "workflow_steps",
        "workflow_id, step_order"
    );

    await createIndexIfMissing(
        "idx_exec_instance_status_step",
        "step_executions",
        "workflow_instance_id, status, step_name"
    );

    await createIndexIfMissing(
        "idx_exec_attempt",
        "step_executions",
        "workflow_instance_id, step_name, attempt"
    );

    await createIndexIfMissing(
        "idx_exec_running",
        "step_executions",
        "workflow_instance_id, step_name, status, created_at"
    );

    await createIndexIfMissing(
        "idx_instances_status",
        "workflow_instances",
        "status"
    );
}

module.exports = { initializeDatabase };






// const mysql = require("mysql2/promise");
// const fs = require("fs");
// const path = require("path");

// async function initializeDatabase(config, db) {
//     // Connect without selecting a database
//     const connection = await mysql.createConnection({
//         host: config.host,
//         user: config.user,
//         password: config.password,
//         port: config.port || 3306
//     });

//     try {
//         const database = config.database;

//         if (!/^[a-zA-Z0-9_$-]+$/.test(database)) {
//             throw new Error("Invalid MySQL database name");
//         }

//         await connection.query(
//             `CREATE DATABASE IF NOT EXISTS \`${database}\``
//         );
//     } finally {
//         await connection.end();
//     }

//     // Use the existing application pool
//     const initPath = path.join(__dirname, "init.sql");
//     const sql = fs.readFileSync(initPath, "utf8");

//     const statements = sql
//         .split(";")
//         .map(statement => statement.trim())
//         .filter(Boolean);

//     for (const statement of statements) {
//         await db.query(statement);
//     }
// }

// module.exports = { initializeDatabase };
