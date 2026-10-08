const express = require("express");

const {
    createRunController
} = require("../controllers/runController");


const createRunRoutes = (db) => {

    const router = express.Router();

    const runController =
        createRunController(db);


    router.get(
        "/",
        runController.getRuns
    );

    router.get(
        "/:id",
        runController.getRun
    );

    router.get(
        "/:id/steps",
        runController.getRunSteps
    );


    return router;
};


module.exports = {
    createRunRoutes
};

// const express = require("express");
// const router = express.Router();

// const runController = require("../controllers/runController");

// // router.post("/", runController.startRun);
// router.get("/", runController.getRuns);
// router.get("/:id", runController.getRun);
// router.get("/:id/steps", runController.getRunSteps);

// module.exports = {router};