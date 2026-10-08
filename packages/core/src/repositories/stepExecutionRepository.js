const STEP_TIMEOUT_SECONDS = 60;

const createStepRepo = (db) => {

  async function getLastSuccessfulStep(workflow_instance_id) {

    const [rows] = await db.query(`
    SELECT ws.step_order
    FROM step_executions se
    JOIN workflow_steps ws
    ON se.step_name = ws.step_name
    WHERE se.workflow_instance_id = ?
    AND se.status = 'success'
    ORDER BY ws.step_order DESC
    LIMIT 1
  `, [workflow_instance_id]);

    return rows.length ? rows[0].step_order : 0;
  }


  async function getNextAttempt(workflow_instance_id, step_name) {

    const [rows] = await db.query(`
    SELECT attempt
    FROM step_executions
    WHERE workflow_instance_id = ?
    AND step_name = ?
    ORDER BY attempt DESC
    LIMIT 1
  `, [workflow_instance_id, step_name]);

    const lastAttempt = rows.length ? rows[0].attempt : 0;

    return lastAttempt + 1;
  }


  async function createExecution(workflow_instance_id, step_name, attempt) {

    await db.query(`
    INSERT INTO step_executions
    (id, workflow_instance_id, step_name, status, attempt)
    VALUES (UUID(), ?, ?, 'running', ?)
  `, [workflow_instance_id, step_name, attempt]);

  }


  async function markSuccess(workflow_instance_id, step_name, attempt, output) {
    await db.query(`
    UPDATE step_executions
    SET status='success', output=?
    WHERE workflow_instance_id=? 
    AND step_name=? 
    AND attempt=?
  `, [JSON.stringify(output), workflow_instance_id, step_name, attempt]);
  }


  async function markFailed(workflow_instance_id, step_name, attempt) {

    await db.query(`
    UPDATE step_executions
    SET status='failed'
    WHERE workflow_instance_id=? 
    AND step_name=? 
    AND attempt=?
  `, [workflow_instance_id, step_name, attempt]);

  }


  // check if step already running
  async function getRunningExecution(workflow_instance_id, step_name) {

    const [rows] = await db.query(`
    SELECT *
    FROM step_executions
    WHERE workflow_instance_id = ?
    AND step_name = ?
    AND status = 'running'
    ORDER BY created_at DESC
    LIMIT 1
  `, [workflow_instance_id, step_name]);

    return rows[0];
  }

  function isExpired(execution) {

    const created = new Date(execution.created_at);
    const now = new Date();

    const diff = (now - created) / 1000;

    return diff > STEP_TIMEOUT_SECONDS;
  }

  async function getAllOutputs(workflow_instance_id) {
    const [rows] = await db.query(`
    SELECT step_name, output
    FROM step_executions
    WHERE workflow_instance_id = ?
    AND status = 'success'
  `, [workflow_instance_id]);

    const map = {};
    for (const row of rows) {
      try {
        if (row.output == null) {
          map[row.step_name] = null;
        } else if (typeof row.output === "string") {
          map[row.step_name] = JSON.parse(row.output);
        } else {
          map[row.step_name] = row.output;
        }
      } catch (err) {
        console.error("Invalid JSON for step:", row.step_name);
        map[row.step_name] = null;
      }
    }

    return map;
  }

  async function createInitialInput(connection, workflowInstanceId, input) {

    await connection.query(`
        INSERT INTO step_executions
        (id, workflow_instance_id, step_name, status, attempt, output)
        VALUES (UUID(), ?, '__input__', 'success', 1, ?)
    `, [
        workflowInstanceId,
        JSON.stringify(input)
    ]);

}

  return {
    getLastSuccessfulStep,
    getNextAttempt,
    createExecution,
    markSuccess,
    markFailed,
    getRunningExecution,
    isExpired,
    getAllOutputs,
    createInitialInput
  }

}

module.exports = {
  createStepRepo
};