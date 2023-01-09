import fs from "fs/promises";
import path from "path";
import { createCommand, Option } from "commander";
import prompts from "prompts";
import kleur from "kleur";
import { AuthHeader, HttpCClient, HttpCClientError } from "@httpc/client";
import { log } from "../utils";


type CallCommandOptions = Readonly<{
    setup?: boolean
    endpoint?: string
    config?: boolean
    access?: "read" | "write"
    read?: boolean
}>

export const CallCommand = createCommand("call")
    .description("call a function on an httpc server")
    .option("--setup", "create a configuration used for all calls")
    .option("--no-config", "don't load the config even if present")
    .option("-s, --server <address>", "the httpc server address")
    .addOption(new Option("-a, --access <level>", "set the call access type").choices(["read", "write"]))
    .option("--read", "shortcut for --access read")
    .arguments("[arguments...]")
    .configureHelp({
        commandDescription: () => "",
        commandUsage: cmd => `
  httpc ${cmd.name()} --setup                        create a configuration used for all calls
  httpc ${cmd.name()} <function> [arguments...]      call a function on an httpc server`
    })
    .action(async ([callPath, ...args]: string[], options: CallCommandOptions) => {

        if (options.setup) {
            await runCallSetup();
            return;
        }


        if (!callPath) {
            throw new Error("Missing function to call");
        }

        const config = options.config ? await readConfig() : undefined;

        const {
            read,
            access = read ? "read" : "write",
            endpoint = config?.endpoint || "http://localhost:3000",
        } = options;

        // args preprocessing
        // 1. try to parse numbers
        // 2. try to parse objects {...}
        const params = args.map(x => {
            if (!isNaN(x as any)) {
                return Number(x);
            } else if (x.startsWith("{") && x.endsWith("}")) {
                return JSON.parse(x);
            } else {
                return x;
            }
        });

        const client = createClient({
            ...config,
            endpoint,
        });

        const result = await (access === "read"
            ? client.read(callPath, ...params)
            : client.write(callPath, ...params)
        ).catch(err => {
            if (err instanceof Error && err.name === "FetchError") {
                log.error(err.message);
                return err;
            }
            if (err instanceof HttpCClientError) {
                log.error(`HTTP ${err.status}`);
                return err.body;
            }

            throw err;
        });

        if (result instanceof Error) {
            // already handled 
            return;
        }


        if (result === undefined) {
            log.minor("(no value)");
            return;
        }

        console.log(JSON.stringify(result, undefined, 2));
    });



const DEFAULT_CONFIG_FILE = "httpc-client.config.local";

type ClientConfig = Readonly<{
    endpoint?: string
    authentication?: string
}>

async function readConfig(): Promise<ClientConfig | undefined> {
    try {
        const configFile = DEFAULT_CONFIG_FILE;
        return JSON.parse(await fs.readFile(configFile, "utf8"));
    } catch {
    }
}

async function runCallSetup() {
    console.log("This procedure will help to create a common configuration used by all calls");

    const responses = await prompts([
        {
            name: "endpoint",
            type: "text",
            message: "Type the server address",
            initial: "http://localhost:3000",
            validate: value => {
                try {
                    return !!new URL(value);
                } catch {
                    return false;
                }
            }
        },
        {
            name: "authentication",
            type: "select",
            message: "Select authentication",
            choices: [
                { title: "None", value: "none" },
                { title: "Bearer", value: "Bearer" },
                { title: "ApiKey", value: "ApiKey" },
            ]
        },
        {
            name: "token",
            type: prev => prev === "none" ? null : "password",
            message: prev => `Type the ${prev === "Bearer" ? "bearer token" : "api key"}`
        },
    ], {
        onCancel: () => {
            process.exit(0);
        }
    });

    const configuration = {
        endpoint: responses.endpoint,
        authentication: responses.authentication !== "none" ? `${responses.authentication} ${responses.token}` : undefined
    };

    const configFile = path.resolve(DEFAULT_CONFIG_FILE);
    await fs.writeFile(configFile, JSON.stringify(configuration, undefined, 2), "utf8");

    console.log("\r");
    log.done(`Written configuration to: ${kleur.bold("%s")}`, configFile);
    console.log("\nNow on this configuration is shared by all calls");
    console.log(`You can run ${kleur.bold("httpc call --setup")} again to change it`);
    console.log("Or you can delete it if you don't need it anymore");
}


function createClient(options: ClientConfig) {
    const client = new HttpCClient({
        endpoint: options.endpoint,
    });

    if (options.authentication) {
        const [schema, value] = options.authentication.split(" ");
        if (!schema || !value) {
            log.error("Invalid configuration: authentication is malformed");
            process.exit(1);
        }

        client.use(AuthHeader(schema, value));
    }

    return client;
}
