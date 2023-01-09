import path from "path";
import { createCommand } from "commander";
import prompts from "prompts";
import { fsUtils, log, packageUtils, run, templateUtils } from "../utils";



type CreateCommandOptions = Readonly<{
    template?: string
    name?: string
    force?: boolean
    interactive?: boolean
}>

const CreateCommand = createCommand("create")
    .description("quickly setup an httpc package from a template")
    .option("-t, --template <template-name>", "template to use")
    .option("-n, --name <package-name>", "the name of the package being created")
    .option("-f, --force", "no confirmation asked", false)
    .option("--no-interactive", "no prompt mode, exit with non-zero code when parameters missing")
    .argument("[dir]", "directory where to create the package")
    .action(async (dir: string | undefined, options: CreateCommandOptions) => {

        let {
            template,
            name,
            force,
            interactive,
        } = options;

        const TEMPLATES = (await fetchTemplateCatalogue().catch(() => [])).filter(x => x.type === "server");
        if (TEMPLATES.length === 0) {
            log.warn("Cannot access template catalogue, maybe a connection issue");
            return;
        }

        if (template) {
            if (!TEMPLATES.some(x => x.id === template)) {
                log.warn(`template '${template}' not found`);
                template = undefined;
            }
        }

        if (!template) {
            if (!interactive) {
                throw Error("Required: template (no interactive exit)");
            }
            ({ template } = await prompts({
                name: "template",
                type: "select",
                message: "Select a template you want to start with",
                choices: TEMPLATES.map(x => ({
                    value: x.id,
                    title: x.title,
                    description: x.description,
                })),
            }));
        }


        if (!dir) {
            if (!interactive) {
                throw Error("Required: output directory (no interactive exit)");
            }

            ({ dir } = await prompts({
                name: "dir",
                type: "text",
                message: "Specify the output directory",
                // format: (dir: string) => path.resolve(dir),
            }));
        }

        const outDir = path.resolve(dir!);
        if (!await fsUtils.isDirEmpty(outDir)) {
            if (!force && interactive) {
                const { confirm } = await await prompts({
                    name: "confirm",
                    type: "confirm",
                    message: `Output directory(${outDir}) not empty, all content will be deleted. Confirm?`,
                    initial: true,
                });

                if (!confirm) {
                    return;
                }
            } else {
                log.warn("Output directory(%s) not empty: all content will be deleted", outDir);
            }
        }

        if (!name) {
            let attemptName = path.basename(outDir);

            if (attemptName && !interactive) {
                name = attemptName;
            } else {
                ({ name } = await prompts({
                    name: "name",
                    type: "text",
                    message: "Specify the package name",
                    initial: attemptName
                }));
            }
        }


        let packageJson = await templateUtils.initialize(template!, outDir, {
            packageName: name
        });
        if (packageJson.httpc) {
            packageJson = await packageUtils.patch(outDir, {
                httpc: {
                    ...packageJson.httpc,
                    name: `${name}-client`
                }
            });
        }


        if (interactive && !force) {
            const packageManager = detectPackageManager() || "npm";

            const { install } = await prompts({
                name: "install",
                type: "confirm",
                message: `Install dependencies (${packageManager} install)?`,
                initial: true,
            });

            if (install) {
                await run(`${packageManager} install`, { cwd: outDir });
            }
        }

        console.log("\n");
        log.success(`Package ${name} generated`);
        console.log("\n");
    });

export default CreateCommand;



function detectPackageManager(): string | undefined {
    const ua = process.env.npm_config_user_agent;
    if (!ua) return;
    return ua?.split(" ")[0].split("/")[0].trim();
}


export type TemplateInfo = Readonly<{
    id: string
    name: string
    title: string
    description?: string
    path: string
    version: string
    type: "client" | "server"
}>

async function fetchTemplateCatalogue(): Promise<TemplateInfo[]> {
    // const url = "https://raw.githubusercontent.com/giuseppelt/httpc/templates/templates.json";
    const url = "https://github.com/giuseppelt/httpc/raw/master/templates/templates.json";
    const response = await fetch(url);

    return await response.json();
}
