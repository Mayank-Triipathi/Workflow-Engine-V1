#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const clientPath = path.join(__dirname, "..", "client");

const npmCommand =
  process.platform === "win32" ? "npm.cmd" : "npm";

const nodeModulesPath = path.join(clientPath, "node_modules");

function runNpm(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(npmCommand, args, {
      cwd: clientPath,
      stdio: "inherit"
    });

    child.on("error", reject);

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`npm command failed with code ${code}`));
      }
    });
  });
}

async function startDashboard() {
  try {
    if (!fs.existsSync(nodeModulesPath)) {
      console.log("Installing dashboard dependencies...");
      await runNpm(["install"]);
      console.log("Dashboard dependencies installed.\n");
    }

    await runNpm(["run", "dev"]);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

startDashboard();