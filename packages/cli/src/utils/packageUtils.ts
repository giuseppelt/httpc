import fs from "fs/promises";
import path from "path";
import { fsUtils } from ".";



export async function read(cwd?: string): Promise<any> {
    cwd = path.resolve(cwd || ".");

    const packageFile = path.resolve(cwd, "package.json");
    if (!fsUtils.exists(packageFile)) {
        throw new Error("package.json not found in the current path");
    }

    return JSON.parse(await fs.readFile(packageFile, "utf-8"));
}

export async function patch(dir: string, patch: object | ((json: object) => object)): Promise<void> {
    const packageContent = await read(dir);
    if (typeof patch === "function") {
        patch = patch(packageContent);
    }
    if (patch) {
        Object.assign(packageContent, patch);
    }

    await fs.writeFile(path.resolve(dir, "package.json"), JSON.stringify(packageContent, null, 2), "utf-8");

    return packageContent;
}
