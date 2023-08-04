import fss from "fs";
import fs from "fs/promises";
import zlib from "zlib";
import https from "https";


export async function exists(path: string): Promise<boolean> {
    return await fs.access(path).then(
        () => true,
        () => false
    );
}

export function unzip(source: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const src = fss.createReadStream(source);
        const dest = fss.createWriteStream(destination);

        src.pipe(zlib.createGunzip()).pipe(dest);

        dest.on("close", resolve);;
        dest.on("error", reject);
    });
}


export function downloadTo(url: string, destination: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const file = fss.createWriteStream(destination);

        const request = https.get(url, response => {
            if ((response.statusCode || 0) >= 400) {
                reject(new Error(`HTTP-${response.statusCode}`));
                return;
            }

            response.pipe(file);
        });
        request.on("error", reject);

        file.on("finish", resolve);
        file.on("error", reject);
    });
}
