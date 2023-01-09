import { exec } from "child_process";


export async function run(cmd: string, option?: {
    cwd?: string
}) {
    return await new Promise<void>((resolve, reject) => {
        exec(cmd, {
            ...option,
        }, (error, stdout, stderr) => {
            if (error) {
                console.error(error.stack);
                console.log('Error code: ' + error.code);
                reject(error);
                return;
            }

            resolve();
        });
    });
}
