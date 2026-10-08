const { v4: uuidv4 } = require("uuid");

const createWorkflowController = (db) => {

    const createWorkflow = async (req, res) => {
        try {
            const { name } = req.body;

            if (!name) {
                return res.status(400).json({
                    error: "Workflow name required"
                });
            }

            const workflow_id = uuidv4();

            const [existing] = await db.query(
                `SELECT id FROM workflows WHERE name = ?`,
                [name]
            );

            if (existing.length > 0) {
                return res.status(400).json({
                    error: "Workflow name already exists"
                });
            }

            await db.query(
                `INSERT INTO workflows (id, name) VALUES (?, ?)`,
                [workflow_id, name]
            );

            res.json({
                message: "Workflow created",
                workflow_id
            });

        } catch (err) {
            console.error(err);

            res.status(500).json({
                error: "Failed to create workflow"
            });
        }
    };


    const deleteWorkflow = async (req, res) => {

        const connection = await db.getConnection();

        try {

            const workflow_id = req.params.id;
            const force = req.query.force === "true";

            await connection.beginTransaction();

            const [instances] = await connection.query(
                `SELECT id
                 FROM workflow_instances
                 WHERE workflow_id = ?
                 LIMIT 1`,
                [workflow_id]
            );

            if (instances.length > 0 && !force) {

                await connection.rollback();

                return res.status(400).json({
                    message:
                        "Workflow has instances. Confirm delete with ?force=true to delete everything."
                });
            }

            await connection.query(
                `DELETE FROM workflow_instances
                 WHERE workflow_id = ?`,
                [workflow_id]
            );

            await connection.query(
                `DELETE FROM workflow_steps
                 WHERE workflow_id = ?`,
                [workflow_id]
            );

            await connection.query(
                `DELETE FROM workflows
                 WHERE id = ?`,
                [workflow_id]
            );

            await connection.commit();

            res.json({
                message: force
                    ? "Workflow and all associated data deleted"
                    : "Workflow deleted"
            });

        } catch (err) {

            await connection.rollback();

            console.error(err);

            res.status(500).json({
                error: "Failed to delete workflow"
            });

        } finally {
            connection.release();
        }
    };


    const addStep = async (req, res) => {

        const connection = await db.getConnection();

        try {

            const workflow_id = req.params.id;
            const { step_name, step_order } = req.body;

            if (!step_name || step_order == null) {
                return res.status(400).json({
                    error: "step_name and step_order required"
                });
            }

            if (step_order < 1) {
                return res.status(400).json({
                    error: "step_order must be >= 1"
                });
            }

            const [expected_step] = await connection.query(
                `SELECT step_order
                 FROM workflow_steps
                 WHERE workflow_id = ?
                 ORDER BY step_order DESC
                 LIMIT 1`,
                [workflow_id]
            );

            if (
                expected_step.length === 0 &&
                step_order > 1
            ) {
                return res.status(400).json({
                    error: "Invalid step_order. First step_order should be 1"
                });
            }

            if (
                expected_step.length > 0 &&
                step_order > expected_step[0].step_order + 1
            ) {
                return res.status(400).json({
                    error:
                        `Invalid step_order. Next step_order should be ${expected_step[0].step_order + 1}`
                });
            }

            const step_id = uuidv4();

            await connection.beginTransaction();

            await connection.query(
                `UPDATE workflow_steps
                 SET step_order = step_order + 1
                 WHERE workflow_id = ?
                 AND step_order >= ?`,
                [workflow_id, step_order]
            );

            await connection.query(
                `INSERT INTO workflow_steps
                 (id, workflow_id, step_name, step_order)
                 VALUES (?, ?, ?, ?)`,
                [
                    step_id,
                    workflow_id,
                    step_name,
                    step_order
                ]
            );

            await connection.commit();

            res.json({
                message: "Step added",
                step_id
            });

        } catch (err) {

            await connection.rollback();

            console.error(err);

            res.status(500).json({
                error: "Failed to add step"
            });

        } finally {
            connection.release();
        }
    };


    const deleteStep = async (req, res) => {

        const connection = await db.getConnection();

        try {

            const step_id = req.params.stepId;

            const [rows] = await connection.query(
                `SELECT workflow_id, step_order
                 FROM workflow_steps
                 WHERE id = ?`,
                [step_id]
            );

            if (rows.length === 0) {
                connection.release();

                return res.status(404).json({
                    error: "Step not found"
                });
            }

            const {
                workflow_id,
                step_order
            } = rows[0];

            await connection.beginTransaction();

            await connection.query(
                `DELETE FROM workflow_steps
                 WHERE id = ?`,
                [step_id]
            );

            await connection.query(
                `UPDATE workflow_steps
                 SET step_order = step_order - 1
                 WHERE workflow_id = ?
                 AND step_order > ?`,
                [workflow_id, step_order]
            );

            await connection.commit();

            res.json({
                message: "Step deleted"
            });

        } catch (err) {

            await connection.rollback();

            console.error(err);

            res.status(500).json({
                error: "Failed to delete step"
            });

        } finally {
            connection.release();
        }
    };


    const getWorkflows = async (req, res) => {

        try {

            const [rows] = await db.query(
                `SELECT *
                 FROM workflows
                 ORDER BY created_at DESC`
            );

            res.json(rows);

        } catch (err) {

            console.error(err);

            res.status(500).json({
                error: "Failed to fetch workflows"
            });
        }
    };


    const getWorkflow = async (req, res) => {

        try {

            const workflow_id = req.params.id;

            const [workflow] = await db.query(
                `SELECT *
                 FROM workflows
                 WHERE id = ?`,
                [workflow_id]
            );

            if (workflow.length === 0) {
                return res.status(404).json({
                    error: "Workflow not found"
                });
            }

            const [steps] = await db.query(
                `SELECT id, step_name, step_order
                 FROM workflow_steps
                 WHERE workflow_id = ?
                 ORDER BY step_order`,
                [workflow_id]
            );

            res.json({
                workflow: workflow[0],
                steps
            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                error: "Failed to fetch workflow"
            });
        }
    };


    const getDashboard = async (req, res) => {

        try {

            const [[workflowStats]] = await db.query(`
                SELECT COUNT(*) AS total_workflows
                FROM workflows
            `);

            const [[runStats]] = await db.query(`
                SELECT
                    COUNT(*) AS total_runs,
                    SUM(status = 'running') AS running_runs,
                    SUM(status = 'failed') AS failed_runs,
                    SUM(status = 'completed') AS success_runs
                FROM workflow_instances
            `);

            res.json({
                total_workflows:
                    workflowStats.total_workflows || 0,

                total_runs:
                    runStats.total_runs || 0,

                running_runs:
                    runStats.running_runs || 0,

                failed_runs:
                    runStats.failed_runs || 0,

                success_runs:
                    runStats.success_runs || 0
            });

        } catch (err) {

            console.error(err);

            res.status(500).json({
                error: "Failed to fetch dashboard stats"
            });
        }
    };


    return {
        createWorkflow,
        addStep,
        getWorkflows,
        getWorkflow,
        deleteWorkflow,
        deleteStep,
        getDashboard
    };
};


module.exports = {
    createWorkflowController
};

// const { db } = require("../db/mysql");
// const { v4: uuidv4 } = require("uuid");

// const createWorkflow = async (req, res) => {
//   try {

//     const { name } = req.body;

//     if (!name) {
//       return res.status(400).json({ error: "Workflow name required" });
//     }

//     const workflow_id = uuidv4();

//     if(await db.query(`SELECT id FROM workflows WHERE name = ?`, [name]).then(([rows]) => rows.length > 0)) {
//       return res.status(400).json({ error: "Workflow name already exists" });
//     }

//     await db.query(
//       `INSERT INTO workflows (id, name) VALUES (?, ?)`,
//       [workflow_id, name]
//     );

//     res.json({
//       message: "Workflow created",
//       workflow_id
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to create workflow" });
//   }
// };

// const deleteWorkflow = async (req, res) => {
//   const connection = await db.getConnection(); // 🔥 get connection
//   try {
//     const workflow_id = req.params.id;
//     const force = req.query.force === "true"; // ?force=true

//     await connection.beginTransaction();

//     // 🔍 Check if instances exist
//     const [instances] = await connection.query(
//       `SELECT id FROM workflow_instances WHERE workflow_id = ? LIMIT 1`,
//       [workflow_id]
//     );

//     if (instances.length > 0 && !force) {
//       await connection.rollback();

//       return res.status(400).json({
//         message: "Workflow has instances. Confirm delete with ?force=true to delete everything.",
//       });
//     }

//     // 🔥 If force OR no instances → delete everything

//     // Delete instances
//     await connection.query(
//       `DELETE FROM workflow_instances WHERE workflow_id = ?`,
//       [workflow_id]
//     );

//     // Delete steps
//     await connection.query(
//       `DELETE FROM workflow_steps WHERE workflow_id = ?`,
//       [workflow_id]
//     );

//     // Delete workflow
//     await connection.query(
//       `DELETE FROM workflows WHERE id = ?`,
//       [workflow_id]
//     );

//     await connection.commit();

//     res.json({
//       message: force
//         ? "Workflow and all associated data deleted"
//         : "Workflow deleted",
//     });

//   } catch (err) {
//     await connection.rollback();
//     console.error(err);
//     res.status(500).json({ error: "Failed to delete workflow" });
//   } finally {
//     connection.release();
//   }
// };

// const addStep = async (req, res) => {
//   const connection = await db.getConnection(); // 🔥 get connection

//   try {
//     const workflow_id = req.params.id;
//     const { step_name, step_order } = req.body;

//     if (!step_name || step_order == null) {
//       return res.status(400).json({ error: "step_name and step_order required" });
//     }

//     if(step_order<1) {
//       return res.status(400).json({ error: "step_order must be >= 1" });
//     }

//     const [expected_step] = await db.query(
//       `select step_order from workflow_steps where workflow_id = ? order by step_order desc limit 1`,
//       [workflow_id]
//     );

//     if(expected_step.length==0 && step_order>1) {
//       return res.status(400).json({
//         error: `Invalid step_order. First step_order should be 1`,
//       });
//     }


//     if (expected_step.length > 0 && step_order > expected_step[0].step_order + 1) {
//       return res.status(400).json({
//         error: `Invalid step_order. Next step_order should be ${expected_step[0].step_order + 1}`,
//       });
//     }

//     const step_id = uuidv4();

//     await connection.beginTransaction(); 

//     // Shift steps
//     await connection.query(
//       `UPDATE workflow_steps
//        SET step_order = step_order + 1
//        WHERE workflow_id = ? AND step_order >= ?`,
//       [workflow_id, step_order]
//     );

//     // Insert step
//     await connection.query(
//       `INSERT INTO workflow_steps
//        (id, workflow_id, step_name, step_order)
//        VALUES (?, ?, ?, ?)`,
//       [step_id, workflow_id, step_name, step_order]
//     );

//     await connection.commit();

//     res.json({
//       message: "Step added",
//       step_id
//     });

//   } catch (err) {
//     await connection.rollback(); // 🔥 important
//     console.error(err);
//     res.status(500).json({ error: "Failed to add step" });
//   } finally {
//     connection.release(); // 🔥 VERY IMPORTANT
//   }
// };

// const deleteStep = async (req, res) => {
//   const connection = await db.getConnection(); // 🔥 get connection

//   try {
//     const step_id = req.params.stepId;

//     // 🔥 Get step info first
//     const [rows] = await connection.query(
//       `SELECT workflow_id, step_order FROM workflow_steps WHERE id = ?`,
//       [step_id]
//     );

//     if (rows.length === 0) {
//       return res.status(404).json({ error: "Step not found" });
//     }

//     const { workflow_id, step_order } = rows[0];

//     await connection.beginTransaction();

//     // Delete the step
//     await connection.query(
//       `DELETE FROM workflow_steps WHERE id = ?`,
//       [step_id]
//     );

//     // 🔥 Shift remaining steps backward
//     await connection.query(
//       `UPDATE workflow_steps
//        SET step_order = step_order - 1
//        WHERE workflow_id = ? AND step_order > ?`,
//       [workflow_id, step_order]
//     );

//     await connection.commit();

//     res.json({
//       message: "Step deleted"
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to delete step" });
//   }
// };



// const getWorkflows = async (req, res) => {
//   try {

//     const [rows] = await db.query(
//       `SELECT * FROM workflows ORDER BY created_at DESC`
//     );

//     res.json(rows);

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch workflows" });
//   }
// };



// const getWorkflow = async (req, res) => {
//   try {

//     const workflow_id = req.params.id;

//     const [workflow] = await db.query(
//       `SELECT * FROM workflows WHERE id = ?`,
//       [workflow_id]
//     );

//     const [steps] = await db.query(
//       `SELECT id, step_name, step_order
//        FROM workflow_steps
//        WHERE workflow_id = ?
//        ORDER BY step_order`,
//       [workflow_id]
//     );

//     if (workflow.length === 0) {
//       return res.status(404).json({ error: "Workflow not found" });
//     }

//     res.json({
//       workflow: workflow[0],
//       steps
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Failed to fetch workflow" });
//   }
// };

// const getDashboard = async (req, res) => {
  
//   try {

//     const [[workflowStats]] = await db.query(`
//       SELECT COUNT(*) AS total_workflows
//       FROM workflows
//     `);

//     const [[runStats]] = await db.query(`
//       SELECT
//         COUNT(*) AS total_runs,
//         SUM(status = 'running') AS running_runs,
//         SUM(status = 'failed') AS failed_runs,
//         SUM(status = 'completed') AS success_runs
//       FROM workflow_instances
//     `);

//     res.json({
//       total_workflows: workflowStats.total_workflows || 0,
//       total_runs: runStats.total_runs || 0,
//       running_runs: runStats.running_runs || 0,
//       failed_runs: runStats.failed_runs || 0,
//       success_runs: runStats.success_runs || 0
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({
//       error: "Failed to fetch dashboard stats"
//     });
//   }
// };

// module.exports = {
//   createWorkflow,
//   addStep,
//   getWorkflows,
//   getWorkflow,
//   deleteWorkflow,
//   deleteStep,
//   getDashboard
// };


