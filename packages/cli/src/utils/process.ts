import { exec } from "child_process";


export async function run(cmd: string, option?: {
    cwd?: string
    showOutput?: boolean
}) {
    return await new Promise<void>((resolve, reject) => {
        exec(cmd, { ...option }, (error, stdout, stderr) => {
            if (error) {
                console.error(error.stack);
                console.log("\nError code: " + error.code);
                console.log(stdout);
                reject(error);
                return;
            }

            if (option?.showOutput && stdout) {
                console.log(stdout);
            }

            resolve();
        });
    });
}
