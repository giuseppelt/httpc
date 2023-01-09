import fs from "fs/promises";
import type { TemplateInfo } from "../packages/cli/src/commands/create";


async function main() {
    const items = await fs.readdir("templates");

    const templateDirs = [];
    // filter directories
    for (const item of items) {
        if ((await fs.stat(`templates/${item}`)).isDirectory()) {
            templateDirs.push(item);
        }
    }

    const templates: TemplateInfo[] = [];
    for (const dir of templateDirs) {
        const packageJson = JSON.parse(await fs.readFile(`templates/${dir}/package.json`, "utf8")) as any;
        templates.push({
            id: dir,
            name: packageJson.name,
            title: packageJson.title,
            description: packageJson.description,
            type: packageJson.templateType || "server",
            path: `templates/${dir}`,
            version: packageJson.version,
        });
    }

    await fs.writeFile("templates/templates.json", JSON.stringify(templates, null, 4), "utf8");
    console.log("Template catalogue generated: %d templates", templates.length);
    console.log(templates.map(x => `- ${x.id} (${x.type})`).join("\n"));
}


main();

