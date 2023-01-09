const fs = require("fs");
const { version } = require("../package.json");

const versionFile = "./dist/version.js";

let content = fs.readFileSync(versionFile, "utf-8");
content = content.replace(/VERSION = ".+"/g, `VERSION = "${version}"`);
fs.writeFileSync(versionFile, content, "utf-8");

console.log("Exported version: %s", version);