import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import ts from "typescript";
import { createCommand } from "commander";
import prompt from "prompts";
import { fsUtils, log, packageUtils, run, templateUtils } from "../utils";



function getDefaultConfig(packageJson: any): HttpCConfig {
    const { name } = packageJson;

    return {
        name: `${name}-client`,
        dest: "client",
        entry: "src/calls/index.ts"
    };
}


// read order
// 1. httpc.json file near the package.json
// 2. httpc field on the package.json
async function readConfig(options?: {
    useDefault?: boolean
}): Promise<HttpCConfig[]> {
    const packageJson = await packageUtils.read();
    let httpcConfig: HttpCConfig | undefined;

    if (await fsUtils.exists(path.resolve("./httpc.json"))) {
        httpcConfig = JSON.parse(await fs.readFile("httpc.json", "utf8"));
        log.verbose("Config from httpc.json");
    } else {
        httpcConfig = packageJson.httpc;
        if (httpcConfig) {
            log.verbose("Config from package.json");
        }
    }

    if (!httpcConfig && options?.useDefault) {
        httpcConfig = getDefaultConfig(packageJson);
    }

    if (!httpcConfig) {
        throw new Error("No httpc client config set");
    }

    const configs = [httpcConfig].flat();
    if (configs.length === 0) {
        throw new Error("No httpc client config set");
    }

    return configs;
}

async function writeTypeIndex(rootFile: string, outDir: string) {
    const typeFileName = path.basename(rootFile).replace(/^(.+)\.ts$/gi, (_, m) => m);
    const typeFile = `${typeFileName}.d.ts`;

    let dirs = sanitizePath(path.dirname(rootFile)).split("/");

    while (dirs.shift()) {
        const target = path.resolve(outDir, ...dirs, typeFile);
        if (await fsUtils.exists(target)) {
            // no need to write if it's in the root and it's already the index
            if (dirs.length === 0 && typeFile === "index.d.ts") return;

            // re-export the default from the inner path
            const content = `export { default } from "./${sanitizePath(path.relative(outDir, path.dirname(target)))}/${typeFileName}"`;
            await fs.writeFile(path.resolve(outDir, "index.d.ts"), content, "utf-8");
            return;
        }
    }


    throw new Error("Cant find root type");
}

function sanitizePath(path: string) {
    return path.split("\\").join("/");
}


export type HttpCConfig = {
    name: string
    entry: string
    dest: string
}

const init = createCommand("init")
    .description("initialize a client package")
    .action(async () => {

        const configs = await readConfig({ useDefault: true });

        for (const config of configs) {
            const dest = path.resolve(config.dest);
            if (!await fsUtils.isDirEmpty(dest)) {
                const { confirm } = await prompt({
                    name: "confirm",
                    type: "confirm",
                    message: `The destination directory '${dest}' is not empty.\n  Confirm initialization? (all content will be deleted)`
                });

                if (!confirm) continue;
            }

            await templateUtils.initialize("client", dest, {
                packageName: config.name
            });

            console.log("Client '%s' initialized", config.name);
        }
    });

const generate = createCommand("generate")
    .description("generate a client typings")
    .action(async () => {
        const configs = await readConfig();

        const tsConfigPath = path.resolve("tsconfig.json");
        const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        const { options, fileNames } = ts.parseJsonConfigFileContent(tsConfig.config, ts.sys, ".");


        for (const config of configs) {
            const entry = path.resolve(config.entry);

            // check presence
            if (!await fsUtils.exists(path.resolve(config.dest, "package.json"))) {
                await templateUtils.initialize("client", config.dest, {
                    packageName: config.name
                });
                console.log("Client '%s' initialized", config.name);
            }


            const dest = path.resolve(config.dest, "types");
            await fsUtils.clearDir(dest);

            const compilerOptions: ts.CompilerOptions = {
                ...options,
                noEmit: false,
                skipLibCheck: true,
                sourceMap: false,
                emitDeclarationOnly: true,
                declaration: true,
                declarationMap: true,
                outDir: dest,
                removeComments: false,
            };

            if (!await fsUtils.exists(entry)) {
                throw new Error(`Client '${config.name}' entry '${config.entry}' not found`);
            }

            const host = ts.createCompilerHost(compilerOptions);
            const compiler = ts.createProgram(fileNames, compilerOptions, host);
            const originalWriteFile = host.writeFile;
            host.writeFile = function (filename: string, text: string, ...args: any[]) {
                if (filename.endsWith(".d.ts")) {
                    text = text.replaceAll(/import\(("|')@httpc\/server("|')\)\.HttpCallPipelineDefinition/g, "HttpCallPipelineDefinition");
                    text = text.replaceAll(/import\s?\{\s?HttpCallPipelineDefinition\s?\}\s?from ("|')@httpc\/server("|');?/g, "");
                    text = text.replaceAll(/import\(("|')@httpc\/kit("|')\)\.HttpCallPipelineDefinition/g, "HttpCallPipelineDefinition");
                    text = text.replaceAll(/import\s?\{\s?HttpCallPipelineDefinition\s?\}\s?from ("|')@httpc\/kit("|');?/g, "");
                }

                //@ts-ignore
                return originalWriteFile.call(this, filename, text, ...args);
            }


            const result = compiler.emit();

            if (result.emitSkipped) {
                console.error(result.diagnostics);
                throw new Error(`Client '${config.name}' generation failed`);
            }

            await writeTypeIndex(entry, dest);


            // create random main file
            // in order to execute metadata extraction
            const main = path.join(__dirname, `main-${crypto.randomUUID()}.ts`);

            await fs.writeFile(main, `
import "reflect-metadata";
import api from "${sanitizePath(entry.replace(".ts", ""))}";
import { writeMetadata } from "${sanitizePath(path.join(__dirname, "../utils/generateMetadata"))}";

writeMetadata(api, "${sanitizePath(dest)}")
    .then(()=> process.exit(0))
    .catch(err=> {
        console.error(err);
        process.exit(1);
    });
`
                , "utf8");

            const executeOptions = {
            };

            await run(`npx ts-node --transpileOnly --project "${tsConfigPath}" -O "${JSON.stringify(executeOptions).split('"').join('\\"')}"  ${sanitizePath(main)}`)
                .finally(() => fs.unlink(main));

            log.success("Client '%s' generated", config.name);
        }
    });


const ClientCommand = createCommand("client")
    .description("manage httpc client generation")
    .addCommand(init)
    .addCommand(generate)

export default ClientCommand;
