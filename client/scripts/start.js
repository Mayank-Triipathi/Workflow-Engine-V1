// in Node.js ES modules require is not available, so we use the import syntax instead
import fs from "fs";
import path from "path";
import readline from "readline";
import { spawn } from "child_process";

// in Node.js ES modules, __dirname is not available, so we use the following workaround
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, "..", "config.json");

// Read saved configuration
let config = {
    backendPort: 8000
};

if (fs.existsSync(configPath)) {
    config = JSON.parse(
        fs.readFileSync(configPath, "utf-8")
    );
}

const savedPort = config.backendPort;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question(
    `Backend port [${savedPort}]: `,
    (answer) => {

        const port = answer.trim() === ""
            ? savedPort
            : Number(answer);

        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            console.log("Invalid port.");
            rl.close();
            process.exit(1);
        }

        // Save selected port
        fs.writeFileSync(
            configPath,
            JSON.stringify(
                { backendPort: port },
                null,
                2
            )
        );

        rl.close();

        console.log(`Backend: http://localhost:${port}`);

        // Start Vite
        const vite = spawn(
            "npm",
            ["run", "vite"],
            {
                stdio: "inherit",
                shell: true,
                env: {
                    ...process.env,
                    VITE_API: `http://localhost:${port}`
                }
            }
        );

        vite.on("exit", (code) => {
            process.exit(code ?? 0);
        });
    }
);


