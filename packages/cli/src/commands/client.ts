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
                noEmit: true,
                skipLibCheck: true,
                sourceMap: false,
                // emitDeclarationOnly: true,
                // declaration: true,
                declarationMap: !!cmdOptions.debug,
                outDir: dest,
                removeComments: !cmdOptions.debug,
            };

            if (!await fsUtils.exists(entry)) {
                throw new Error(`Client '${config.name}' entry '${config.entry}' not found`);
            }

            await emitDeclaration(entry, fileNames, compilerOptions);

            log.success("Client '%s' generated", config.name);
        }
    });


async function emitDeclaration(entry: string, fileNames: string[], compilerOptions: ts.CompilerOptions) {
    const program = ts.createProgram(fileNames, compilerOptions);
    const checker = program.getTypeChecker();
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    const sourceFile = program.getSourceFile(entry)!;
    const dest = compilerOptions.outDir!;
    const exportedSymbols = new Map<string, { symbol: ts.Symbol; type: ts.Type }>();
    const collectedTypes = new Map<string, ts.Type>();
    const typeAliasNames = new Set<string>();
    let defaultExportSymbol: ts.Symbol | undefined;

    // Collect all exported symbols
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile)!;
    const moduleExports = checker.getExportsOfModule(moduleSymbol);

    for (const symbol of moduleExports) {
        if (isHidden(symbol)) continue;

        // Check if this is the default export
        if (symbol.escapedName === "default") {
            defaultExportSymbol = symbol;
            continue;
        }

        const type = checker.getTypeOfSymbolAtLocation(symbol, sourceFile);
        exportedSymbols.set(symbol.escapedName as string, { symbol, type });
    }

    // Recursively collect all types used by exports
    const visitedTypes = new Set<ts.Type>();

    function isCollectableType(type: ts.Type): boolean {
        const primitiveFlags =
            ts.TypeFlags.Any |
            ts.TypeFlags.Unknown |
            ts.TypeFlags.Undefined |
            ts.TypeFlags.Null |
            ts.TypeFlags.Void |
            ts.TypeFlags.Never |
            ts.TypeFlags.BooleanLike |
            ts.TypeFlags.NumberLike |
            ts.TypeFlags.BigIntLike |
            ts.TypeFlags.StringLike |
            ts.TypeFlags.ESSymbolLike;
        if (type.flags & primitiveFlags) return false;

        const decls = type.symbol?.declarations ?? type.aliasSymbol?.declarations;
        if (decls?.some(d => d.getSourceFile().fileName.includes("typescript/lib/"))) return false;
        return true;
    }

    function collectTypesRecursive(type: ts.Type, sourceTypeNames: Set<string> = new Set()) {
        type = unwrapPipelineType(type, checker);
        if (!isCollectableType(type)) return;
        if (visitedTypes.has(type)) return;
        visitedTypes.add(type);

        // Prefer alias symbol to avoid de-aliasing
        const typeSymbol = type.aliasSymbol || type.symbol;
        if (typeSymbol) {
            const typeName = typeSymbol.escapedName as string;
            const sourceFile = typeSymbol.valueDeclaration?.getSourceFile();

            if (sourceFile && !isHidden(typeSymbol)) {
                sourceTypeNames.add(typeName);
                collectedTypes.set(typeName, type);
                typeAliasNames.add(typeName);
            }
        }

        // Collect types from call signatures (params and return), preserving aliases via nodes
        for (const sig of type.getCallSignatures()) {
            const sigDecl = sig.getDeclaration?.();
            const params = sig.getParameters();

            params.forEach((param, i) => {
                let paramType: ts.Type | undefined;
                const paramDecl = sigDecl?.parameters?.[i];
                if (paramDecl?.type) {
                    paramType = checker.getTypeFromTypeNode(paramDecl.type);
                }
                if (!paramType) {
                    const decl = param.valueDeclaration || param.declarations?.[0] || sourceFile!;
                    paramType = checker.getTypeOfSymbolAtLocation(param, decl);
                }
                if (paramType) collectTypesRecursive(paramType, sourceTypeNames);
            });

            let returnType: ts.Type | undefined;
            if (sigDecl?.type) {
                returnType = checker.getTypeFromTypeNode(sigDecl.type);
            }
            if (!returnType) {
                returnType = sig.getReturnType();
            }
            collectTypesRecursive(returnType, sourceTypeNames);
        }

        // Collect types from constructor signatures (params and return/instance), preserving aliases via nodes
        for (const sig of type.getConstructSignatures()) {
            const sigDecl = sig.getDeclaration?.();
            const params = sig.getParameters();

            params.forEach((param, i) => {
                let paramType: ts.Type | undefined;
                const paramDecl = sigDecl?.parameters?.[i];
                if (paramDecl?.type) {
                    paramType = checker.getTypeFromTypeNode(paramDecl.type);
                }
                if (!paramType) {
                    const decl = param.valueDeclaration || param.declarations?.[0] || sourceFile!;
                    paramType = checker.getTypeOfSymbolAtLocation(param, decl);
                }
                if (paramType) collectTypesRecursive(paramType, sourceTypeNames);
            });

            let returnType: ts.Type | undefined;
            if (sigDecl?.type) {
                returnType = checker.getTypeFromTypeNode(sigDecl.type);
            }
            if (!returnType) {
                returnType = sig.getReturnType();
            }
            collectTypesRecursive(returnType, sourceTypeNames);
        }

        // Recursively collect from object type properties
        if (type.isClassOrInterface() || type.flags & ts.TypeFlags.Object) {
            const properties = type.getProperties();
            for (const prop of properties) {
                const propType = checker.getTypeOfSymbolAtLocation(prop, sourceFile!);
                collectTypesRecursive(propType, sourceTypeNames);
            }
            const bases = (type as ts.InterfaceType).getBaseTypes?.() ?? [];
            for (const base of bases) collectTypesRecursive(base, sourceTypeNames);
        }

        // Handle union and intersection types
        if (type.isUnion()) {
            for (const unionType of (type as ts.UnionType).types) {
                collectTypesRecursive(unionType, sourceTypeNames);
            }
        }

        if (type.flags & ts.TypeFlags.Intersection) {
            for (const intersectionType of (type as ts.IntersectionType).types) {
                collectTypesRecursive(intersectionType, sourceTypeNames);
            }
        }

        // Handle generic type arguments
        if (type.flags & ts.TypeFlags.Object && (type as ts.TypeReference).typeArguments) {
            for (const typeArg of (type as ts.TypeReference).typeArguments!) {
                collectTypesRecursive(typeArg, sourceTypeNames);
            }
        }
    }

    for (const { type } of exportedSymbols.values()) {
        collectTypesRecursive(type);
    }

    if (defaultExportSymbol) {
        const defaultType = checker.getTypeOfSymbolAtLocation(defaultExportSymbol, sourceFile);
        collectTypesRecursive(defaultType);
    }

    // Handle name collisions by renaming duplicates
    const nameMap = new Map<string, string>();
    const usedNames = new Set(exportedSymbols.keys());

    for (const typeName of typeAliasNames) {
        if (usedNames.has(typeName)) {
            let newName = `${typeName}_`;
            let counter = 1;
            while (usedNames.has(newName)) {
                newName = `${typeName}_${counter++}`;
            }
            nameMap.set(typeName, newName);
            usedNames.add(newName);
        }
    }

    // Generate consolidated declaration file with transformations
    const declarations: string[] = [];

    console.log([...collectedTypes.values()].map((t) => t.symbol?.escapedName));

    // Add type imports/definitions
    for (const [originalName, type] of collectedTypes) {
        const renamedName = nameMap.get(originalName) || originalName;
        const typeSymbol = type.symbol || type.aliasSymbol;
        if (typeSymbol?.declarations) {
            const declaration = typeSymbol.declarations[0];
            if (declaration && (ts.isTypeAliasDeclaration(declaration) || ts.isInterfaceDeclaration(declaration) || ts.isEnumDeclaration(declaration))) {
                declarations.push(printDeclarationWithRename(printer, declaration, sourceFile, originalName, renamedName));
            }
        }
    }

    // Add exports with transformations
    declarations.push("");
    for (const [exportName, { symbol }] of exportedSymbols) {
        const exportType = checker.getTypeOfSymbolAtLocation(symbol, sourceFile);
        const unwrappedType = unwrapPipelineType(exportType, checker);
        let typeNode = checker.typeToTypeNode(unwrappedType, undefined, ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.WriteArrayAsGenericType);
        typeNode = typeNode ? unwrapPipelineTypeNode(typeNode) : typeNode;
        const typeStr = typeNode ? printTypeNodeWithCommas(printer, typeNode, sourceFile) : "any";
        declarations.push(`export declare const ${exportName}: ${typeStr};`);
    }

    if (defaultExportSymbol) {
        const defaultType = checker.getTypeOfSymbolAtLocation(defaultExportSymbol, sourceFile);
        const unwrappedType = unwrapPipelineType(defaultType, checker);
        let typeNode = checker.typeToTypeNode(unwrappedType, undefined, ts.NodeBuilderFlags.NoTruncation | ts.NodeBuilderFlags.WriteArrayAsGenericType);
        typeNode = typeNode ? unwrapPipelineTypeNode(typeNode) : typeNode;
        const typeStr = typeNode ? printTypeNodeWithCommas(printer, typeNode, sourceFile) : "any";
        declarations.push(`export default ${typeStr};`);
    }

    // Write consolidated declaration file
    const indexDtsPath = path.resolve(dest, "index.d.ts");
    await fs.writeFile(indexDtsPath, declarations.join("\n\n"), "utf-8");

    // Write type index redirects if needed
    // await writeTypeIndex(entry, dest);
}

function unwrapPipelineType(type: ts.Type, checker: ts.TypeChecker): ts.Type {
    // Unwrap HttpCallPipelineDefinition<T> to T
    if (type.aliasSymbol?.escapedName === "HttpCallPipelineDefinition" &&
        type.aliasTypeArguments?.length === 1) {
        return type.aliasTypeArguments[0];
    }
    return type;
}

function unwrapPipelineTypeNode(typeNode: ts.TypeNode): ts.TypeNode {
    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
        if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName) && node.typeName.text === "HttpCallPipelineDefinition" && node.typeArguments?.length === 1) {
            return ts.visitNode(node.typeArguments[0], visit);
        }
        return ts.visitEachChild(node, visit, undefined);
    };
    return ts.visitNode(typeNode, visit) as ts.TypeNode;
}

function printDeclarationWithRename(
    printer: ts.Printer,
    declaration: ts.Declaration,
    sourceFile: ts.SourceFile,
    originalName: string,
    renamedName: string
): string {
    let text = printer.printNode(ts.EmitHint.Unspecified, declaration, sourceFile);
    if (originalName !== renamedName) {
        text = text.replace(new RegExp(`\\b${originalName}\\b`, "g"), renamedName);
    }
    return text;
}

function printTypeNodeWithCommas(printer: ts.Printer, node: ts.TypeNode, sourceFile: ts.SourceFile, indent = 0): string {
    if (ts.isTypeLiteralNode(node)) {
        const pad = "    ".repeat(indent);
        const childPad = "    ".repeat(indent + 1);
        const members = node.members.map(m => {
            if (ts.isPropertySignature(m)) {
                const name = printer.printNode(ts.EmitHint.Unspecified, m.name, sourceFile);
                const optional = m.questionToken ? "?" : "";
                const typePart = m.type ? printTypeNodeWithCommas(printer, m.type, sourceFile, indent + 1) : "any";
                return `${childPad}${name}${optional}: ${typePart}`;
            }
            return `${childPad}${printer.printNode(ts.EmitHint.Unspecified, m, sourceFile)}`;
        });
        return members.length ? `{\n${members.join(",\n")}\n${pad}}` : "{}";
    }
    return printer.printNode(ts.EmitHint.Unspecified, node, sourceFile);
}

function isHidden(symbol: ts.Symbol): boolean {
    if (!symbol.declarations) return false;

    for (const declaration of symbol.declarations) {
        const jsDocTags = ts.getJSDocTags(declaration);
        if (jsDocTags.some(tag => tag.tagName.text === "hidden")) {
            return true;
        }
    }
    return false;
}


const ClientCommand = createCommand("client")
    .description("manage httpc client generation")
    .addCommand(init)
    .addCommand(generate)

export default ClientCommand;
