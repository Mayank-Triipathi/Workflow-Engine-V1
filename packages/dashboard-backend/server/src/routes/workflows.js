const express = require("express");

const {
    createWorkflowController
} = require("../controllers/workflowController");


const createWorkflowRoutes = (db) => {

    const router = express.Router();

    const workflowController =
        createWorkflowController(db);


    router.post(
        "/",
        workflowController.createWorkflow
    );

    router.post(
        "/:id/steps",
        workflowController.addStep
    );

    router.get(
        "/",
        workflowController.getWorkflows
    );

    router.get(
        "/dashboard",
        workflowController.getDashboard
    );

    router.get(
        "/:id",
        workflowController.getWorkflow
    );

    router.delete(
        "/:workflowId/steps/:stepId",
        workflowController.deleteStep
    );

    router.delete(
        "/:id",
        workflowController.deleteWorkflow
    );


    return router;
};


module.exports = {
    createWorkflowRoutes
};


// const express = require("express");
// const router = express.Router();
// const workflowController = require("../controllers/workflowController.js");

// router.post("/", workflowController.createWorkflow);
// router.post("/:id/steps", workflowController.addStep);
// router.get("/", workflowController.getWorkflows);
// router.get("/dashboard", workflowController.getDashboard);
// router.get("/:id", workflowController.getWorkflow);
// router.delete("/:workflowId/steps/:stepId", workflowController.deleteStep);
// router.delete("/:id", workflowController.deleteWorkflow);

// module.exports = { router };