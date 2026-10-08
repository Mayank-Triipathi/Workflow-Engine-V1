const express = require("express");
const cors = require("cors");

const {
    createWorkflowRoutes
} = require("./routes/workflows");

const {
    createRunRoutes
} = require("./routes/runs");


const createDashboard = ({ db, port = 8000 , frontendPort = 5173}) => {

    if (!db) {
        throw new Error("Database connection required");
    }

    const app = express();

    app.use(express.json());

    app.use(cors({
        origin: [
            `http://localhost:${frontendPort}`,
            `http://127.0.0.1:${frontendPort}`
        ],
        methods: [
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH"
        ],
        credentials: true
    }));


    app.get("/", (req, res) => {
        res.json({
            message: "Workflow Engine API"
        });
    });


    app.use(
        "/workflows",
        createWorkflowRoutes(db)
    );

    app.use(
        "/runs",
        createRunRoutes(db)
    );


    let server = null;


    return {

        start() {

            return new Promise((resolve) => {

                server = app.listen(port, () => {

                    console.log(
                        `🚀 Dashboard API running on port ${port}`
                    );

                    resolve();
                });

            });
        },


        close() {

            return new Promise((resolve, reject) => {

                if (!server) {
                    resolve();
                    return;
                }

                server.close((err) => {

                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });

            });
        }

    };
};


module.exports = {
    createDashboard
};


// const express = require("express");
// const dotenv = require("dotenv");
// dotenv.config();
// const { router: workflowRoutes } = require("./routes/workflows");
// const { router: runRoutes } = require("./routes/runs");


// // Resume any running workflows on server start

// //giving access control to frontend http://localhost:5173/

// const app = express();
// app.use(express.json());
// const cors = require("cors");
// app.use(cors({
//   origin: [
//     "http://localhost:5173",
//     "http://127.0.0.1:5173"
//   ],
//   methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//   credentials: true
// }));


// app.get("/", async (req, res) => {
//   res.json({ message: "Workflow Engine API" });
// });

// app.use("/workflows", workflowRoutes);
// app.use("/runs", runRoutes);

// const port = process.env.server_port || 8000;

// app.listen(port, () => {
//   console.log(`🚀 Engine running on port ${port}`);
// });