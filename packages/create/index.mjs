#!/usr/bin/env node
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

// forward to the @httpc/cli create command
const args = process.argv.slice(2);

spawn("npx", ["httpc", "create", ...args], {
    stdio: "inherit",
    shell: true,
    cwd: path.dirname(fileURLToPath(import.meta.url)) // path local to the package
});
