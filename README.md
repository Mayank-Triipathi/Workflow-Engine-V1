# ZenInFlow

**A Dynamic Workflow Orchestration Engine Built with Node.js**

Create, execute, monitor, and recover custom workflows through a visual dashboard and a distributed worker architecture.

<p align="center">
  <a href="https://www.npmjs.com/package/zeninflow">
    <img src="https://img.shields.io/npm/v/zeninflow" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/zeninflow">
    <img src="https://img.shields.io/npm/dt/zeninflow" alt="npm downloads">
  </a>
</p>

**Install:**
```bash
npm install zeninflow
---

## Overview

ZenInFlow is a Node.js workflow orchestration engine that allows developers to create and execute custom workflows without hardcoding workflow definitions into their applications.

Unlike traditional implementations where workflows are predefined in application code, ZenInFlow separates workflow definition from workflow execution.

Developers define workflows through a visual dashboard, register their own executor functions in their Node.js application, and let ZenInFlow handle execution, persistence, asynchronous job scheduling, and recovery.

Built using Node.js, MySQL, Redis, and BullMQ, ZenInFlow provides a modular architecture for executing multi-step workflows reliably.

## Use Cases

ZenInFlow is designed for applications that involve multiple dependent operations, background processing, or long-running business workflows.

Instead of manually managing execution order, retries, and workflow state, developers can define workflows through the dashboard and implement their business logic using custom executors.

### 1. E-commerce Order Processing

Automate multi-step order processing by breaking business operations into individual workflow steps.

**Example workflow:**

<img width="216" height="359" alt="image" src="https://github.com/user-attachments/assets/1e8720d6-3383-445e-8e66-a665b8063e57" />


If an operation fails, ZenInFlow can retry the failed step without requiring the entire workflow to be manually restarted.

### 2. Data Processing Pipelines

Build sequential data processing pipelines where each step consumes or builds upon the outputs of previous steps.

**Example workflow:**

<img width="162" height="279" alt="image" src="https://github.com/user-attachments/assets/de011ed3-5139-4762-bfde-33a00c9f4a49" />


Developers can implement each processing operation as an independent executor while ZenInFlow manages step progression and execution state.

### 3. Background Task Automation

Execute resource-intensive or time-consuming operations asynchronously without blocking the main application flow.

**Examples:**
- Sending emails and notifications.
- Generating reports.
- Processing uploaded files.
- Performing multi-step background operations.

BullMQ and Redis handle asynchronous job scheduling, while dedicated workers execute the tasks.

### 4. Multi-step API Integrations

Coordinate operations across multiple external services through a sequence of independent executors.

**Example workflow:**

<img width="220" height="282" alt="image" src="https://github.com/user-attachments/assets/4e7de95d-14fd-4934-91a9-bd9a35c071ce" />


Each operation can be implemented independently, making integrations easier to organize and maintain.

### 5. Long-running Business Processes

Manage business processes consisting of multiple steps that may take considerable time to complete.

**Examples:**
- Document approval processes.
- Employee onboarding.
- Account verification.
- Multi-stage application processing.

With persistent execution state and recovery mechanisms, eligible workflows can resume after unexpected interruptions.

---

## Why ZenInFlow?

Traditional applications often require developers to implement workflow orchestration, execution tracking, background processing, and recovery mechanisms themselves.

ZenInFlow brings these responsibilities together.

| Without ZenInFlow | With ZenInFlow |
|---|---|
| Manually coordinate multiple operations | Define workflows through a dashboard |
| Implement custom execution orchestration | Use a dedicated workflow engine |
| Maintain execution state manually | Persist workflow and step execution states |
| Build background job processing separately | Use BullMQ and Redis |
| Build monitoring interfaces separately | Use the included dashboard |
| Handle interrupted executions manually | Use workflow recovery mechanisms |

**ZenInFlow aims to simplify workflow orchestration so developers can focus on implementing business logic rather than managing the entire execution lifecycle.**

## Features

- **Dynamic Workflow Creation:** Create and configure workflows through a visual dashboard.
- **Custom Executors:** Register your own JavaScript functions to execute individual workflow steps.
- **Asynchronous Execution:** Process workflow jobs using BullMQ and Redis.
- **Persistent State Management:** Store workflow instances and step execution records in MySQL.
- **Worker-Based Architecture:** Separate workflow execution from API operations.
- **Automatic Step Progression:** Automatically schedule the next workflow step after successful execution.
- **Retry Mechanism:** Retry failed steps with configurable maximum attempts.
- **Step Timeout:** Prevent individual steps from running indefinitely using execution timeouts.
- **Workflow Recovery:** Identify and resume eligible interrupted workflows after engine restarts.
- **Dashboard:** Monitor workflow execution through a dedicated dashboard.
- **CLI Support:** Launch the dashboard using `npx zeninflow-dashboard`.

## Architecture

ZenInFlow follows a modular architecture in which workflow management, job scheduling, execution, and persistence are handled by separate components.

<img width="667" height="437" alt="image" src="https://github.com/user-attachments/assets/41a5e34c-9c56-4b95-aac0-2f6c2f5a22d8" />



### Core Components

| Component | Responsibility |
|---|---|
| WorkflowEngine | Main interface for initializing and managing the engine |
| MySQL | Stores workflow definitions, instances, and execution states |
| Redis | Provides queue infrastructure |
| BullMQ | Handles asynchronous job scheduling |
| Worker | Processes queued workflow jobs |
| Workflow Executor | Determines and executes the next workflow step |
| Custom Executors | Execute developer-defined business logic |
| Recovery Module | Identifies and resumes eligible interrupted workflows |
| Dashboard | Provides workflow creation and execution monitoring |

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime environment |
| Express.js | Backend API |
| MySQL | Persistent storage |
| mysql2 | MySQL connection management |
| Redis | Queue infrastructure |
| BullMQ | Job scheduling and processing |
| ioredis | Redis client |
| React.js | Dashboard frontend |
| Vite | Frontend development and build |
| Tailwind CSS | Dashboard styling |
| Docker | Infrastructure management |

---

# Getting Started

## 1. Prerequisites

Before using ZenInFlow, make sure you have:

- Node.js installed.
- npm installed.
- A running MySQL instance.
- A running Redis instance.

Docker can be used to run the required infrastructure locally.

## 2. Installation

Install ZenInFlow using npm:

```bash
npm install zeninflow
```

The package can then be imported into your Node.js application.

```js
const WorkflowEngine = require("zeninflow");
```

## 3. Configure Environment Variables

Create a `.env` file in your application:

```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=workflow_engine
MYSQL_PORT=3306

REDIS_HOST=localhost
REDIS_PORT=6379
```

These values will be used to configure the MySQL and Redis connections.

## 4. Configure Database Connection

Create a MySQL configuration file:

```js
// mysql.js

const dbConfig = {
    host: process.env.MYSQL_HOST || "localhost",
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || "workflow_engine",
    port: process.env.MYSQL_PORT || 3306
};

module.exports = { dbConfig };
```

ZenInFlow uses this configuration to establish its internal MySQL connection pool.

The engine also initializes its required database structures when started.

## 5. Configure Redis

Create a Redis connection using `ioredis`:

```js
// redis.js

const Redis = require("ioredis");

const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null
});

module.exports = { redis };
```

Pass the Redis connection instance to ZenInFlow.

**Important:** ZenInFlow expects an existing Redis connection, not just a host and port configuration object.

---

# Creating Custom Executors

Executors are JavaScript functions responsible for performing the actual work of individual workflow steps.

Developers register executors using an object where each key represents a step name.

For example:

```js
// executors.js

const executors = {

    ValidateOrder: async (context) => {

        console.log("Validating order");

        return {
            success: true,
            output: "Order validated"
        };
    },

    ProcessPayment: async (context) => {

        console.log("Processing payment");

        return {
            success: true,
            output: "Payment completed"
        };
    },

    SendConfirmation: async (context) => {

        console.log("Sending confirmation");

        return {
            success: true,
            output: "Confirmation sent"
        };
    }

};

module.exports = { executors };
```

### Executor Context

Every executor receives a context object containing information about the current workflow execution.

| Property | Description |
|---|---|
| workflowInstanceId | Unique ID of the workflow instance |
| step_name | Name of the currently executing step |
| attempt | Current execution attempt |
| idempotencyKey | Unique key generated for the workflow instance and step |
| previousOutputs | Outputs from previously recorded workflow steps |
| input | Initial input provided when triggering the workflow |

Example:

```js
const executors = {

    ProcessOrder: async (context) => {

        const {
            workflowInstanceId,
            step_name,
            attempt,
            idempotencyKey,
            previousOutputs,
            input
        } = context;

        console.log("Processing workflow:", workflowInstanceId);
        console.log("Current step:", step_name);
        console.log("Attempt:", attempt);
        console.log("Input:", input);

        return {
            success: true,
            output: {
                message: "Order processed",
                userId: input.userId
            }
        };
    }

};
```

**Important:** Executor names must exactly match the corresponding step names defined in the dashboard.

Executors should return serializable results because their outputs are persisted by the engine.

---

# Initializing ZenInFlow

Once the database, Redis connection, and executors are configured, initialize the engine.

```js
// index.js

require("dotenv").config();

const WorkflowEngine = require("zeninflow");

const { dbConfig } = require("./mysql");
const { redis } = require("./redis");
const { executors } = require("./executors");

const engine = new WorkflowEngine({

    dbConfig,

    redis,

    executors,

    worker: {
        concurrency: 5
    },

    retry: {
        maxAttempts: 3
    },

    port: 8000,

    frontendPort: 5173

});

async function main() {

    try {

        await engine.start();

        console.log("ZenInFlow started successfully");

        console.log(engine.status());

    } catch (error) {

        console.error("Engine startup failed:", error);

    }

}

main();
```

### Configuration Options

| Option | Description | Default |
|---|---|---|
| dbConfig | MySQL connection configuration | Required |
| redis | Existing Redis connection | Required |
| executors | Object containing custom executor functions | `{}` |
| worker.concurrency | Number of concurrent worker jobs | `5` |
| retry.maxAttempts | Maximum allowed attempts per step | `3` |
| port | Dashboard backend port | `8000` |
| frontendPort | Dashboard frontend port | `5173` |

---

# Creating Your First Workflow

ZenInFlow v1 provides a dashboard for creating and configuring workflows.

You do not need to hardcode workflow definitions in your application.

### Step 1: Start the Engine

Start your application:

```bash
node index.js
```

This initializes:

- MySQL database structures.
- Redis-backed BullMQ queue.
- Workflow executor.
- Background worker.
- Dashboard backend.
- Workflow recovery mechanism.

### Step 2: Open the Dashboard

Launch the dashboard using:

```bash
npx zeninflow-dashboard
```

Open the dashboard in your browser using the configured frontend port.

### Step 3: Create a Workflow

Use the dashboard to:

1. Create a new workflow.
2. Give it a workflow name.
3. Add the required steps.
4. Configure the execution order.
5. Use step names matching the registered executor names.

For example:

<img width="283" height="257" alt="image" src="https://github.com/user-attachments/assets/89fafb62-f403-45a7-98bd-09405de8c621" />


### Step 4: Trigger the Workflow

Once the workflow has been created, trigger it from your Node.js application:

```js
const result = await engine.trigger("Order Processing", {
    userId: 101,
    orderId: 5001,
    amount: 2500
});

console.log(result);
```

Example response:

```json
{
    "id": 1,
    "status": "pending"
}
```

The engine creates a workflow instance, persists the initial input, and adds the instance to the BullMQ queue.

The worker then begins processing the workflow.

---

# Workflow Execution Lifecycle

Each workflow instance follows a step-by-step execution lifecycle.

1. The engine retrieves the next eligible step.
2. It checks whether an execution is already running.
3. It determines the next execution attempt.
4. It creates a step execution record.
5. The corresponding executor is called with its execution context.
6. The result is persisted in MySQL.
7. The next workflow job is scheduled.
8. The process continues until all steps are completed.

If a step fails, the engine records the failure and schedules another execution attempt, subject to the configured retry limit.

---

# Retry and Timeout Handling

ZenInFlow provides basic execution safeguards.

### Retry Configuration

Configure the maximum number of execution attempts:

```js
retry: {
    maxAttempts: 3
}
```

If a step fails, the engine schedules another attempt until the configured maximum is reached.

### Step Timeout

Each executor has a default execution timeout of 60 seconds.

If an executor exceeds this duration, the execution is treated as failed.

---

# Workflow Recovery

ZenInFlow includes a recovery mechanism to handle interrupted workflow executions.

When the engine starts, it checks for eligible workflow instances that need to resume.

It also schedules a delayed recovery check after 100 seconds.

The recovery mechanism works with persisted workflow and step execution states to determine which workflows can be resumed.

This helps the engine continue processing workflows after unexpected interruptions or service restarts.

**Note:** Recovery does not guarantee exactly-once execution of external side effects. Design executors to be idempotent, especially when interacting with payment gateways, external APIs, or other systems.

---

# Managing the Engine

ZenInFlow exposes methods for controlling the engine lifecycle.

### Check Engine Status

```js
console.log(engine.status());
```

Returns information about:

- Worker status.
- Queue status.
- Worker concurrency.
- Maximum retry attempts.

### Stop the Engine

```js
await engine.stop();
```

This closes the worker, queue, dashboard, and scheduled recovery timer.

It is recommended to stop the engine gracefully when shutting down your application.

---

# Dashboard CLI

ZenInFlow provides a command-line entry point for launching the dashboard.

```bash
npx zeninflow-dashboard
```

This allows developers to start the dashboard without manually navigating into its frontend directory.

The dashboard requires the corresponding backend and infrastructure to be configured and available.

---

# Project Structure

<img width="367" height="595" alt="image" src="https://github.com/user-attachments/assets/91fbc956-6758-4a60-b1dc-bad560ab3a24" />


---

# Future Improvements

- Configurable retry and backoff strategies.
- Advanced workflow execution controls.
- Improved monitoring and observability.
- Enhanced recovery and failure management.
- Additional dashboard analytics.
- Expanded executor integrations.

# Contributing

Contributions, bug reports, and feature suggestions are welcome.

1. Fork the repository.
2. Create a new branch.
3. Implement your changes.
4. Add tests where appropriate.
5. Submit a pull request.

# License

Copyright (c) 2026 Mayank Tripathi

---

**ZenInFlow — Define your workflows. Let the engine handle the execution.**
