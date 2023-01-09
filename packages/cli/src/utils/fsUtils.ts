import fs from "fs/promises";


export async function exists(path: string): Promise<boolean> {
    return await fs.access(path).then(
        () => true,
        () => false
    );
}

export async function isDirEmpty(dir: string): Promise<boolean> {
    return !await exists(dir) || (await fs.readdir(dir)).length === 0;
}

export async function clearDir(dir: string): Promise<void> {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => { });
    await fs.mkdir(dir, { recursive: true });
}

export async function createDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
}

export async function copyDir(source: string, dest: string, exclude?: string[]): Promise<void> {
    if (!await exists(dest)) {
        await fs.mkdir(dest, { recursive: true });
    }

    await fs.cp(source, dest, {
        recursive: true,
        filter: exclude && exclude.length > 0 && ((source) => {
            return !exclude.some(x => !!source.match(x));
        }) || undefined
    });
}
