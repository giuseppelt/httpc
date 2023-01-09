import fs from "fs/promises";

export function getGithubEditLink(url: string) {
    return `https://github.com/giuseppelt/httpc/blob/master/packages/www/src/pages${url}.mdx`;
}


export async function readFile(path: string, fallback?: string) {
    const content = await fs.readFile(path, "utf8").catch(err => {
        if (import.meta.env.DEV) {
            console.warn("Cant read %s", path, err);
            return fallback;
        }

        throw err;
    });

    return content;
}
