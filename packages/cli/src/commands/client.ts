import fs from "fs/promises";
import crypto from "crypto";
import path from "path";
import ts from "typescript";
import { createCommand, program } from "commander";
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

    // remove first entry, if empty
    // linux paths start with /
    if (dirs.length > 0 && dirs[0] === "") dirs.shift();

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

            log.success("Client '%s' initialized", config.name);
        }
    });


type GenerateCommandOptions = Readonly<{
    debug?: boolean
    tsConfig?: string
}>

const collected = new Set<ts.Symbol>()
const visiting = new Set<ts.Symbol>()


const generate = createCommand("generate")
    .description("generate a client typings")
    .option("-d, --debug", "enable compilation settings like sourcemaps")
    .option("-tc, --ts-config <tsconfig>", "path to a custom typescript config")
    .action(async (cmdOptions: GenerateCommandOptions) => {
        const configs = await readConfig();


        let tsConfigPath: string;
        if (cmdOptions.tsConfig) {
            tsConfigPath = path.resolve(".", cmdOptions.tsConfig);
            if (!await fsUtils.exists(tsConfigPath)) {
                throw new Error(`Custom tsConfig(${cmdOptions.tsConfig}) not found`);
            }
        } else {
            tsConfigPath = await fsUtils.exists("tsconfig.client.json")
                ? path.resolve("tsconfig.client.json")
                : path.resolve("tsconfig.json");
        }

        log.verbose("TsConfig from " + path.relative(".", tsConfigPath));


        const tsConfig = ts.readConfigFile(tsConfigPath, ts.sys.readFile);
        const { options, fileNames } = ts.parseJsonConfigFileContent(tsConfig.config, ts.sys, ".");

        for (const config of configs) {
            const entry = path.resolve(config.entry);

            // check presence
            if (!await fsUtils.exists(path.resolve(config.dest, "package.json"))) {
                await templateUtils.initialize("client", config.dest, {
                    packageName: config.name
                });
                log.verbose("Client '%s' initialized", config.name);
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
                declarationMap: !!cmdOptions.debug,
                outDir: dest,
                removeComments: !cmdOptions.debug,
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

            const checker = compiler.getTypeChecker();
            const source = compiler.getSourceFile(entry)!;
            const symbol = checker.getSymbolAtLocation(source);
            const exports = checker.getExportsOfModule(symbol!);

            console.log("Collecting types...");
            exports.forEach(collectSymbol);

            const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed })

            function collectSymbol(symbol: ts.Symbol) {
                if (collected.has(symbol)) return
                if (visiting.has(symbol)) return
                if (isFromLib(symbol)) return
                if (isExternalDeclaration(symbol)) return

                visiting.add(symbol)

                const declarations = symbol.getDeclarations() ?? []

                for (const decl of declarations) {
                    console.log("Collecting from decl:", decl.kind, symbol.getName());
                    if (ts.isVariableDeclaration(decl) || ts.isTypeAliasDeclaration(decl) || ts.isExportDeclaration(decl) || ts.isExportAssignment(decl)) {
                        const type = checker.getTypeOfSymbolAtLocation(symbol, decl)
                        collectType(type)
                    }
                }

                visiting.delete(symbol)
                collected.add(symbol)
            }

            function collectType(type: ts.Type) {
                if (type.flags & ts.TypeFlags.BooleanLike) return
                if (type.flags & ts.TypeFlags.StringLike) return
                if (type.flags & ts.TypeFlags.NumberLike) return
                if (type.flags & ts.TypeFlags.BooleanLike) return
                if (checker.typeToString(type).startsWith("Promise")) return;
                if (checker.typeToString(type).includes("ConcatArray")) return;

                if (["string", "number", "boolean", "undefined", "null", "any", "any[]", "T", "T[]", "U", "U[]", "never", "never[]", "TResult", "TResult1", "() => string", "string[]", "string | undefined", "() => string | undefined"].includes(checker.typeToString(type))) return;

                console.log("Collecting type:", checker.typeToString(type));
                if (type.isUnion() || type.isIntersection()) {
                    type.types.forEach(collectType)
                    return
                }

                if (1 == 1 && type.isTypeParameter()) return

                const symbol = type.getSymbol()
                if (symbol) {
                    collectSymbol(symbol)
                }

                // Handle generics
                if (type.aliasTypeArguments) {
                    type.aliasTypeArguments.forEach(collectType)
                }

                if (type.getCallSignatures().length) {
                    type.getCallSignatures().forEach(sig => {
                        sig.getParameters().forEach(p =>
                            collectType(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration!))
                        )
                        collectType(sig.getReturnType())
                    })
                }

                if (type.getProperties().length) {
                    type.getProperties().forEach(p =>
                        collectType(checker.getTypeOfSymbolAtLocation(p, p.valueDeclaration!))
                    )
                }
            }


            function printNode(node: ts.Node): string {
                const sf = ts.createSourceFile(
                    "declaration.d.ts",
                    "",
                    ts.ScriptTarget.Latest,
                    false,
                    ts.ScriptKind.TS
                )
                return printer.printNode(ts.EmitHint.Unspecified, node, sf)
            }

            function ensureExport(node: ts.Node): ts.Node {
                if (!("modifiers" in node)) return node

                const mods = (ts.canHaveModifiers(node) ? ts.getModifiers(node) : []) || [];
                if (mods.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                    return node
                }

                return node;
                // return ts.factory.updateModifiers(
                //     node,
                //     ts.factory.createNodeArray([
                //         ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
                //         ...mods
                //     ])
                // )
            }
            function isFromLib(symbol: ts.Symbol): boolean {
                const declarations = symbol.getDeclarations()
                if (!declarations || declarations.length === 0) return false

                if (symbol.getName().startsWith("Promise")) return true;

                return declarations.some(decl => {
                    const sf = decl.getSourceFile()
                    return sf.isDeclarationFile && sf.fileName.includes("lib.");
                })
            }

            function isExternalDeclaration(symbol: ts.Symbol): boolean {
                const decls = symbol.getDeclarations()
                if (!decls) return false

                return decls.some(decl => {
                    const sf = decl.getSourceFile()
                    return (
                        sf.isDeclarationFile &&
                        !sf.fileName.includes("/src/") // adjust to your project root
                    )
                })
            }

            const output: string[] = [];

            for (const symbol of collected) {
                const decls = symbol.getDeclarations() ?? []
                for (const decl of decls) {
                    if (
                        ts.isInterfaceDeclaration(decl) ||
                        ts.isTypeAliasDeclaration(decl) ||
                        ts.isEnumDeclaration(decl) ||
                        ts.isClassDeclaration(decl) ||
                        ts.isFunctionDeclaration(decl)
                    ) {
                        const exported = ensureExport(decl)
                        output.push(printNode(exported))
                    }
                }
            }

            console.log(output.join("\n\n"));

            return;

            const result = compiler.emit();

            if (result.emitSkipped && result.diagnostics.length > 0) {
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

            //
            // NB!
            // skipIgnore is required because ts-node skips files inside node_modules
            // but, the generated main- is placed inside a node_module
            //

            await run(`npx ts-node --transpileOnly --skipIgnore --project "${tsConfigPath}" -O "${JSON.stringify(executeOptions).split('"').join('\\"')}" "${sanitizePath(main)}"`)
                .finally(() => fs.unlink(main));

            log.success("Client '%s' generated", config.name);
        }
    });


const ClientCommand = createCommand("client")
    .description("manage httpc client generation")
    .addCommand(init)
    .addCommand(generate)

export default ClientCommand;
