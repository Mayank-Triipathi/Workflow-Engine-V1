const resumeWorkflows = async ({ workflowRepo, queue }) => {

    const instances = await workflowRepo.getRecoverableInstances();

    if (!instances.length) {
        console.log("No running workflows to recover");
        return;
    }

    for (const instance of instances) {

        console.log("Recovering workflow:", instance.id);

        await queue.enqueueWorkflow(instance.id);
    }
};

module.exports = { resumeWorkflows };