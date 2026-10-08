const createRunController = (db) => {

    const getRuns = async (req, res) => {

        try {

            const [rows] = await db.query(`
                SELECT *
                FROM workflow_instances
                ORDER BY created_at DESC
            `);

            res.json(rows);

        } catch (err) {

            console.error(err);

            res.status(500).json({
                error: "Failed to fetch runs"
            });
        }
    };


    const getRun = async (req, res) => {

        try {

            const { id } = req.params;

            const [rows] = await db.query(`
                SELECT *
                FROM workflow_instances
                WHERE id = ?
            `, [id]);

            if (rows.length === 0) {
                return res.status(404).json({
                    error: "Run not found"
                });
            }

            res.json(rows[0]);

        } catch (err) {

            console.error(err);

            res.status(500).json({
                error: "Failed to fetch run"
            });
        }
    };


    const getRunSteps = async (req, res) => {

        try {

            const { id } = req.params;

            const [rows] = await db.query(`
                SELECT
                    step_name,
                    status,
                    attempt,
                    created_at,
                    updated_at
                FROM step_executions
                WHERE workflow_instance_id = ?
                ORDER BY created_at
            `, [id]);

            res.json(rows);

        } catch (err) {

            console.error(err);

            res.status(500).json({
                error: "Failed to fetch step executions"
            });
        }
    };


    return {
        getRuns,
        getRun,
        getRunSteps
    };
};


module.exports = {
    createRunController
};

// const { db } = require("../db/mysql");
// const { v4: uuidv4 } = require("uuid");
// const { workflowQueue } = require("../queues/workflowQueue");


// const startRun = async (req, res) => {
//   try {

//     const { workflow_id, input } = req.body;

//     if (!workflow_id) {
//       return res.status(400).json({ error: "workflow_id required" });
//     }

//     const workflow_instance_id = uuidv4();

//     // create workflow instance
//     await db.query(`
//       INSERT INTO workflow_instances
//       (id, workflow_id, status)
//       VALUES (?, ?, 'pending')
//     `, [workflow_instance_id, workflow_id]);

//     // 🔥 store initial input as step output
//     const INITIAL_STEP = "__input__";

//     // we are directly inserting a success step execution for the initial input, so that the workflow can start from the first real step and have access to the input
//     // this allows steps to access the original input as a step output, and also makes it easier to resume workflows with the original input if needed
//     await db.query(`
//   INSERT INTO step_executions
//   (id, workflow_instance_id, step_name, status, attempt, output)
//   VALUES (UUID(), ?, '__input__', 'success', 1, ?)
// `, [workflow_instance_id, JSON.stringify(input || {})]);

//     // push job to queue
//     await workflowQueue.add("workflowQueue", {
//       workflow_instance_id
//     });

//     res.json({
//       message: "Workflow started",
//       workflow_instance_id
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to start workflow run" });
//   }
// };


// const getRuns = async (req, res) => {
//   try {

//     const [rows] = await db.query(`
//       SELECT *
//       FROM workflow_instances
//       ORDER BY created_at DESC
//     `);

//     res.json(rows);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch runs" });
//   }
// };



// const getRun = async (req, res) => {
//   try {

//     const { id } = req.params;

//     const [rows] = await db.query(`
//       SELECT *
//       FROM workflow_instances
//       WHERE id = ?
//     `, [id]);

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Run not found" });
//     }

//     res.json(rows[0]);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch run" });
//   }
// };



// const getRunSteps = async (req, res) => {
//   try {

//     const { id } = req.params;

//     const [rows] = await db.query(`
//       SELECT step_name, status, attempt, created_at, updated_at
//       FROM step_executions
//       WHERE workflow_instance_id = ?
//       ORDER BY created_at
//     `, [id]);

//     res.json(rows);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch step executions" });
//   }
// };

// module.exports = {
//   // startRun,
//   getRuns,
//   getRun,
//   getRunSteps
// };