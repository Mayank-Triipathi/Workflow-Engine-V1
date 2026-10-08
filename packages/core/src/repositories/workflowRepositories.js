const { v4: uuidv4 } = require('uuid');

const createWorkflowRepo = (db) => {

  async function getWorkflowIdFromInstance(id) {

    const [rows] = await db.query(`
      SELECT workflow_id
      FROM workflow_instances
      WHERE id = ?
      `, [id]);

    return rows[0];
  }


  async function getNextStep(workflow_id, lastOrder) {

    const [rows] = await db.query(`
      SELECT *
      FROM workflow_steps
      WHERE workflow_id = ?
      AND step_order > ?
      ORDER BY step_order
      LIMIT 1
      `, [workflow_id, lastOrder]);

    return rows[0];
  }

  async function markWorkflowRunningIfPending(id) {
    await db.query(`
      UPDATE workflow_instances
      SET status='running'
      WHERE id=? AND status='pending'
    `, [id]);
  }


  async function completeWorkflow(id) {

    await db.query(`
      UPDATE workflow_instances
      SET status='completed'
      WHERE id=?
      `, [id]);

  }


  async function failWorkflow(id) {

    await db.query(`
      UPDATE workflow_instances
      SET status='failed'
      WHERE id=?
      `, [id]);

  }

  async function getByName(name) {
    const [rows] = await db.query(
      "SELECT * FROM workflows WHERE name = ?",
      [name]
    );

    return rows[0];
  }

  async function createInstance(connection, workflowId) {
    const id = uuidv4();

    await connection.query(`
                INSERT INTO workflow_instances
                (id, workflow_id, status)
                VALUES (?, ?, 'pending')
            `, [id, workflowId]);

    return { id };
  }

  async function getRecoverableInstances() {
    const [rows] = await db.query(`
        SELECT id
        FROM workflow_instances
        WHERE status IN ('pending', 'running')
    `);

    return rows;
  }

  return {
    getWorkflowIdFromInstance,
    getNextStep,
    markWorkflowRunningIfPending,
    completeWorkflow,
    failWorkflow,
    getByName,
    createInstance,
    getRecoverableInstances
  }
}

module.exports = {
  createWorkflowRepo
};