import fs from "fs/promises";


const packages = [
    "server",
    "kit",
    "cli",
    "client",
    "adapter-cloudflare"
]

type PackageJson = {
    version: string
}

const TIMESTAMP = new Date().toISOString().substring(0, 19)
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replaceAll("T", "");

const VERSION_TAG = "-pre";

async function main() {
    const released: string[] = [];

    for (const p of packages) {
        const path = `packages/${p}/package.json`;
        const json = JSON.parse(await fs.readFile(path, "utf8")) as PackageJson;
        if (json.version.includes(VERSION_TAG)) {
            json.version = json.version.substring(0, json.version.indexOf(VERSION_TAG) + VERSION_TAG.length) + TIMESTAMP;
            released.push(p);

            await fs.writeFile(path, JSON.stringify(json, undefined, 4), "utf8");
        }
    }

    if (released.length === 0) {
        console.log("No package to prerelease");
        process.exit(1);
    }

    console.log("PreReleased with timestamp: " + TIMESTAMP);
    for (const release of released) {
        console.log("- %s", release);
    }
}

main();
