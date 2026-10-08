const createWorkflowExecutor = ({
  workflowRepo,
  stepRepo,
  queue,
  executors,
  retry
}) => {

  const STEP_TIMEOUT_MS = 60 * 1000;

  const executeWorkflow = async (workflow_instance_id) => {

    const workflow = await workflowRepo.getWorkflowIdFromInstance(workflow_instance_id);

    if (!workflow) {
      console.log("Workflow instance not found");
      return;
    }

    const lastOrder = await stepRepo.getLastSuccessfulStep(workflow_instance_id);

    const step = await workflowRepo.getNextStep(workflow.workflow_id, lastOrder);

    if (!step) {

      await workflowRepo.completeWorkflow(workflow_instance_id);

      console.log("Workflow completed");

      return;
    }

    const running = await stepRepo.getRunningExecution(
      workflow_instance_id,
      step.step_name
    );

    if (running) {

      if (!stepRepo.isExpired(running)) {

        console.log("Step already running");

        return;
      }

      console.log("Recovering expired step");

    }

    const attempt = await stepRepo.getNextAttempt(workflow_instance_id, step.step_name);

    if (attempt > retry.maxAttempts) {
      await stepRepo.markFailed(workflow_instance_id, step.step_name, attempt - 1);

      await workflowRepo.failWorkflow(workflow_instance_id);

      console.log("Max attempts exceeded");

      return;
    }

    await workflowRepo.markWorkflowRunningIfPending(workflow_instance_id);

    try {
      await stepRepo.createExecution(workflow_instance_id, step.step_name, attempt);
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        console.log("Duplicate execution prevented");
        return; // another worker already handling it
      }
      throw err;
    }

    const previousOutputs = await stepRepo.getAllOutputs(workflow_instance_id);
    const idempotencyKey = `${workflow_instance_id}-${step.step_name}`;

    const context = {
      workflowInstanceId: workflow_instance_id,
      step_name: step.step_name,
      attempt,
      idempotencyKey,
      previousOutputs,
      input: previousOutputs["__input__"],
    };

    try {

      const executor = executors[step.step_name];

      if (!executor) {
        throw new Error(`Executor not found for step ${step.step_name}`);
      }

      const result = await Promise.race([
        executor(context),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("STEP_TIMEOUT")),
            STEP_TIMEOUT_MS
          )
        )
      ]);

      await stepRepo.markSuccess(
        workflow_instance_id,
        step.step_name,
        attempt,
        result
      );

      try {
        await queue.enqueueWorkflow(workflow_instance_id); // enqueue next step
      } catch (err) {
        console.error("Failed to enqueue next step:", err);
      }

    }
    catch (err) {
      await stepRepo.markFailed(workflow_instance_id, step.step_name, attempt);

      await queue.enqueueWorkflow(workflow_instance_id); // retry

      console.error(err);

      return;
    }

  }

  return { executeWorkflow };

}

module.exports = { createWorkflowExecutor };