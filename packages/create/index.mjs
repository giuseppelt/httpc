#!/usr/bin/env node
import { spawn } from "child_process";

// forward to the @httpc/cli create command
const args = process.argv.slice(2);

spawn("npx", ["httpc", "create", ...args], {
    stdio: "inherit",
    shell: true,
});
