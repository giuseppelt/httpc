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
                emitDeclarationOnly: false,
                declaration: false,
                declarationMap: false,
                outDir: dest,
                removeComments: !cmdOptions.debug,
            };

            if (!await fsUtils.exists(entry)) {
                throw new Error(`Client '${config.name}' entry '${config.entry}' not found`);
            }

            // HttpCallPipelineDefinition

            await emitDeclaration(entry, fileNames, compilerOptions);

            log.success("Client '%s' generated", config.name);
        }
    });

function emitDeclaration(entry: string, fileNames: string[], compilerOptions: ts.CompilerOptions) {
    const program = ts.createProgram(fileNames, compilerOptions);
    const checker = program.getTypeChecker();
    const sourceFile = program.getSourceFile(entry);

    if (!sourceFile) {
        throw new Error(`Entry file '${entry}' not found`);
    }

    // Find default export
    const defaultExport = findDefaultExport(sourceFile, checker);
    if (!defaultExport) {
        throw new Error(`Entry file '${entry}' must have a default export`);
    }

    const exportType = checker.getTypeAtLocation(defaultExport);
    if (!exportType.isClassOrInterface() && !(exportType.flags & ts.TypeFlags.Object)) {
        throw new Error(`Default export must be an object`);
    }

    // Collect methods and referenced types
    const collectedTypes = new Set<string>();
    const typeDeclarations = new Map<string, string>();
    const generatedTypeNames = new Set<string>(['Client']); // Track generated type names to avoid collisions

    const clientType = processObjectType(program, exportType, checker, defaultExport, collectedTypes, typeDeclarations, sourceFile, [], 'Client', generatedTypeNames);

    // Generate declaration file content
    const destFile = path.join(compilerOptions.outDir!, 'index.d.ts');
    let content = '';

    // Add collected type declarations
    for (const [typeName, declaration] of typeDeclarations) {
        content += declaration + '\n\n';
    }

    // Add client type and nested types
    content += clientType;
    content += 'declare const client: Client;\n';
    content += 'export default client;\n';

    // Write the file
    fs.writeFile(destFile, content, 'utf8');
}

function processObjectType(
    program: ts.Program,
    type: ts.Type,
    checker: ts.TypeChecker,
    node: ts.Node,
    collectedTypes: Set<string>,
    typeDeclarations: Map<string, string>,
    sourceFile: ts.SourceFile,
    path: string[],
    typeName: string,
    generatedTypeNames: Set<string>
): string {
    const methods: string[] = [];
    const nestedTypes: { name: string; typeName: string; content: string }[] = [];

    for (const prop of type.getProperties()) {
        // Skip hidden properties
        if (hasHiddenJSDoc(prop)) {
            continue;
        }

        const propType = checker.getTypeOfSymbolAtLocation(prop, node);
        const pipelineType = extractPipelineType(propType, checker);

        if (pipelineType) {
            const funcType = pipelineType.getCallSignatures()[0];
            if (!funcType) {
                throw new Error(`Property '${[...path, prop.name].join('.')}' must have a function type in HttpCallPipelineDefinition<T>`);
            }

            // Generate method signature
            const methodSig = generateMethodSignature(prop.name, funcType, checker);
            methods.push(methodSig);

            // Collect referenced types
            collectReferencedTypes(funcType, checker, collectedTypes, typeDeclarations, sourceFile, program);
        } else if (propType.flags & ts.TypeFlags.Object && !isBuiltInType(propType, checker)) {
            // Recursively process nested object
            const nestedTypeName = getUniqueTypeName(capitalizeFirst(prop.name), generatedTypeNames);
            generatedTypeNames.add(nestedTypeName);
            const nestedContent = processObjectType(program, propType, checker, node, collectedTypes, typeDeclarations, sourceFile, [...path, prop.name], nestedTypeName, generatedTypeNames);
            nestedTypes.push({ name: prop.name, typeName: nestedTypeName, content: nestedContent });
        }
    }

    // Generate type alias
    let content = '';

    // Add nested types first
    for (const nested of nestedTypes) {
        content += nested.content;
    }

    // Add current type
    content += `type ${typeName} = {\n`;

    for (const method of methods) {
        content += `  ${method}\n`;
    }

    for (const nested of nestedTypes) {
        content += `  readonly ${nested.name}: ${nested.typeName};\n`;
    }

    content += `}\n\n`;

    return content;
}

function getUniqueTypeName(baseName: string, existingNames: Set<string>): string {
    let name = baseName;
    let counter = 1;
    while (existingNames.has(name)) {
        name = `${baseName}${counter}`;
        counter++;
    }
    return name;
}

function findDefaultExport(sourceFile: ts.SourceFile, checker: ts.TypeChecker): ts.Node | undefined {
    let defaultExportNode: ts.Node | undefined;

    ts.forEachChild(sourceFile, node => {
        if (ts.isExportAssignment(node) && !node.isExportEquals) {
            defaultExportNode = node.expression;
        }
    });

    return defaultExportNode;
}

function hasHiddenJSDoc(symbol: ts.Symbol): boolean {
    const tags = symbol.getJsDocTags();
    return tags.some(tag => tag.name === 'hidden');
}

function extractPipelineType(type: ts.Type, checker: ts.TypeChecker): ts.Type | undefined {
    if (!type.aliasSymbol) return undefined;

    const typeName = checker.typeToString(type);
    if (!typeName.startsWith('HttpCallPipelineDefinition<')) return undefined;

    const typeArgs = (type as any).aliasTypeArguments || (type as any).typeArguments;
    if (!typeArgs || typeArgs.length === 0) return undefined;

    return typeArgs[0];
}

function generateMethodSignature(name: string, signature: ts.Signature, checker: ts.TypeChecker): string {
    const params = signature.parameters.map(param => {
        const paramType = checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
        const typeString = getTypeString(paramType, checker);
        return `${param.name}: ${typeString}`;
    }).join(', ');

    const returnType = getTypeString(signature.getReturnType(), checker);
    return `${name}(${params}): ${returnType};`;
}

function getTypeString(type: ts.Type, checker: ts.TypeChecker): string {
    // If the type has an alias symbol (e.g., type alias), use the alias name
    if (type.aliasSymbol) {
        return checker.typeToString(type, undefined, ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope);
    }
    return checker.typeToString(type);
}

function collectReferencedTypes(
    signature: ts.Signature,
    checker: ts.TypeChecker,
    collectedTypes: Set<string>,
    typeDeclarations: Map<string, string>,
    sourceFile: ts.SourceFile,
    program: ts.Program
): void {
    // Collect parameter types
    for (const param of signature.parameters) {
        const paramType = checker.getTypeOfSymbolAtLocation(param, param.valueDeclaration!);
        collectTypeDeclaration(paramType, checker, collectedTypes, typeDeclarations, program);
    }

    // Collect return type
    const returnType = signature.getReturnType();
    collectTypeDeclaration(returnType, checker, collectedTypes, typeDeclarations, program);
}

function collectTypeDeclaration(
    type: ts.Type,
    checker: ts.TypeChecker,
    collectedTypes: Set<string>,
    typeDeclarations: Map<string, string>,
    program: ts.Program
): void {
    console.log("symbol: " + type.symbol?.name);

    // If type has an alias, collect the alias declaration first
    if (type.aliasSymbol) {
        const aliasName = type.aliasSymbol.name;
        console.log("alias: " + aliasName);

        // Skip if marked with @ignore
        if (hasIgnoreJSDoc(type.aliasSymbol)) {
            return;
        }

        if (!collectedTypes.has(aliasName) && !isBuiltInType(type, checker)) {
            collectedTypes.add(aliasName);

            const declarations = type.aliasSymbol.declarations;
            if (declarations && declarations.length > 0) {
                const decl = declarations[0];
                if (ts.isTypeAliasDeclaration(decl)) {
                    const processedDeclaration = preprocessDeclaration(decl, program);
                    typeDeclarations.set(aliasName, processedDeclaration);
                    // const declSourceFile = decl.getSourceFile();
                    // const declaration = decl.getText(declSourceFile);
                    // typeDeclarations.set(aliasName, declaration);

                    if (ts.isTypeReferenceNode(decl.type)) {
                        const symbol = checker.getSymbolAtLocation(decl.type.typeName);
                        const type = checker.getDeclaredTypeOfSymbol(symbol!);
                        collectTypeDeclaration(type, checker, collectedTypes, typeDeclarations, program);

                        decl.type.typeArguments?.forEach(argTypeNode => {
                            if (ts.isUnionTypeNode(argTypeNode) || ts.isIntersectionTypeNode(argTypeNode)) {
                                argTypeNode.types.forEach(typeNode => {
                                    const argType = checker.getTypeFromTypeNode(typeNode);
                                    collectTypeDeclaration(argType, checker, collectedTypes, typeDeclarations, program);
                                });
                            } else {
                                const argType = checker.getTypeAtLocation(argTypeNode);
                                collectTypeDeclaration(argType, checker, collectedTypes, typeDeclarations, program);
                            }
                        });
                    }

                    if (type.isUnion()) {
                        for (const subType of type.types) {
                            collectTypeDeclaration(subType, checker, collectedTypes, typeDeclarations, program);
                        }
                    }

                    if (type.isIntersection()) {
                        for (const subType of type.types) {
                            collectTypeDeclaration(subType, checker, collectedTypes, typeDeclarations, program);
                        }
                    }
                }
            }
        }

        // Still collect nested types from the alias type arguments
        const typeArgs = (type as any).aliasTypeArguments;
        if (typeArgs) {
            for (const arg of typeArgs) {
                collectTypeDeclaration(arg, checker, collectedTypes, typeDeclarations, program);
            }
        }

        // Handle object literal types
        if (type.flags & ts.TypeFlags.Object) {
            const properties = type.getProperties();
            for (const prop of properties) {
                // Skip properties marked with @ignore
                if (hasIgnoreJSDoc(prop)) {
                    continue;
                }
                const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
                collectTypeDeclaration(propType, checker, collectedTypes, typeDeclarations, program);
            }
        }
        return;
    }

    // Handle union types
    if (type.isUnion()) {
        for (const subType of type.types) {
            collectTypeDeclaration(subType, checker, collectedTypes, typeDeclarations, program);
        }
        return;
    }

    // Handle intersection types
    if (type.isIntersection()) {
        for (const subType of type.types) {
            collectTypeDeclaration(subType, checker, collectedTypes, typeDeclarations, program);
        }
        return;
    }

    // Handle generic type arguments (Promise<T>, Array<T>, etc.)
    const typeArgs = (type as any).typeArguments;
    if (typeArgs) {
        for (const arg of typeArgs) {
            collectTypeDeclaration(arg, checker, collectedTypes, typeDeclarations, program);
        }
    }

    const typeName = type.symbol?.name;
    if (!typeName) return;

    // Skip if already collected
    if (collectedTypes.has(typeName)) return;

    // Skip if marked with @ignore
    if (hasIgnoreJSDoc(type.symbol)) {
        return;
    }

    // Skip built-in types
    if (isBuiltInType(type, checker)) {
        return;
    }

    collectedTypes.add(typeName);

    // Get declaration
    const declarations = type.symbol?.declarations;
    if (declarations && declarations.length > 0) {
        const decl = declarations[0];
        const declSourceFile = decl.getSourceFile();

        if (ts.isInterfaceDeclaration(decl) || ts.isTypeAliasDeclaration(decl)) {
            const processedDeclaration = preprocessDeclaration(decl, program);
            typeDeclarations.set(typeName, processedDeclaration);

            // Recursively collect nested types
            if (ts.isInterfaceDeclaration(decl)) {
                for (const member of decl.members) {
                    if (ts.isPropertySignature(member) && member.type) {
                        // Skip properties marked with @ignore
                        if (hasIgnoreJSDocOnNode(member)) {
                            continue;
                        }
                        const memberType = checker.getTypeAtLocation(member.type);
                        collectTypeDeclaration(memberType, checker, collectedTypes, typeDeclarations, program);
                    }
                }
            } else if (ts.isTypeAliasDeclaration(decl) && decl.type) {
                const aliasedType = checker.getTypeAtLocation(decl.type);
                collectTypeDeclaration(aliasedType, checker, collectedTypes, typeDeclarations, program);
            }
        }
    }

    // Handle object literal types
    if (type.flags & ts.TypeFlags.Object && !type.symbol?.declarations) {
        const properties = type.getProperties();
        for (const prop of properties) {
            // Skip properties marked with @ignore
            if (hasIgnoreJSDoc(prop)) {
                continue;
            }
            const propType = checker.getTypeOfSymbolAtLocation(prop, prop.valueDeclaration!);
            collectTypeDeclaration(propType, checker, collectedTypes, typeDeclarations, program);
        }
    }
}

function preprocessDeclaration(decl: ts.InterfaceDeclaration | ts.TypeAliasDeclaration, program: ts.Program): string {
    const sourceFile = decl.getSourceFile();
    const printer = ts.createPrinter();

    if (ts.isInterfaceDeclaration(decl)) {
        // Create a new interface with filtered members
        const filteredMembers = decl.members.filter(member => !hasIgnoreJSDocOnNode(member));

        const newInterface = ts.factory.createInterfaceDeclaration(
            decl.modifiers,
            decl.name,
            decl.typeParameters,
            decl.heritageClauses,
            filteredMembers
        );

        return printer.printNode(ts.EmitHint.Unspecified, newInterface, sourceFile);
    } else if (ts.isTypeAliasDeclaration(decl)) {
        // For type alias, check if it's an object type and filter properties
        const type = decl.type;

        if (ts.isTypeLiteralNode(type)) {
            const filteredMembers = type.members.filter(member => !hasIgnoreJSDocOnNode(member));

            const newTypeLiteral = ts.factory.createTypeLiteralNode(filteredMembers);
            const newTypeAlias = ts.factory.createTypeAliasDeclaration(
                decl.modifiers,
                decl.name,
                decl.typeParameters,
                newTypeLiteral
            );

            return printer.printNode(ts.EmitHint.Unspecified, newTypeAlias, sourceFile);
        } else if (ts.isUnionTypeNode(type) || ts.isIntersectionTypeNode(type)) {
            const filteredTypes = type.types.map(t => {
                if (ts.isTypeLiteralNode(t)) {
                    const filteredMembers = t.members.filter(member => !hasIgnoreJSDocOnNode(member));
                    return ts.factory.createTypeLiteralNode(filteredMembers);
                }
                return t;
            });
            const newUnionOrIntersection = ts.isUnionTypeNode(type)
                ? ts.factory.createUnionTypeNode(filteredTypes)
                : ts.factory.createIntersectionTypeNode(filteredTypes);
            const newTypeAlias = ts.factory.createTypeAliasDeclaration(
                decl.modifiers,
                decl.name,
                decl.typeParameters,
                newUnionOrIntersection
            );
            return printer.printNode(ts.EmitHint.Unspecified, newTypeAlias, sourceFile);
        } else {
            return printer.printNode(ts.EmitHint.Unspecified, decl, sourceFile);
        }
    }

    return printer.printNode(ts.EmitHint.Unspecified, decl, sourceFile);
}

function hasIgnoreJSDoc(symbol: ts.Symbol | undefined): boolean {
    if (!symbol) return false;
    const tags = symbol.getJsDocTags();
    return tags.some(tag => tag.name === 'ignore');
}

function hasIgnoreJSDocOnNode(node: ts.Node): boolean {
    const tags = ts.getJSDocTags(node);
    return tags.some(tag => tag.tagName.text === 'ignore');
}

function isBuiltInType(propType: ts.Type, checker: ts.TypeChecker): boolean {
    const symbol = propType.symbol?.name
    const typeString = checker.typeToString(propType);
    // List of common built-in types in TypeScript
    const builtInTypes = [
        "string", "number", "boolean", "any", "unknown", "void", "null", "undefined", "never", "object", "Date", "Array", "Promise", "Record", "Map", "Set", "ReadonlyArray"
    ];
    // Check for exact match or generic built-ins like Array<T>
    return builtInTypes.some(builtIn =>
        typeString === builtIn || symbol === builtIn || typeString.startsWith(`${builtIn}<`)
    );
}

function capitalizeFirst(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}



const ClientCommand = createCommand("client")
    .description("manage httpc client generation")
    .addCommand(init)
    .addCommand(generate)

export default ClientCommand;

