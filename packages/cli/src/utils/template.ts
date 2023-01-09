import path from "path";
import { downloadTemplate } from "giget";
import { fsUtils, log, packageUtils } from ".";



export async function initialize(templateName: string, dest: string, options?: {
    packageName?: string
}): Promise<any> {
    await fsUtils.clearDir(dest);
    await fsUtils.createDir(dest);

    await copyTemplate(templateName, dest);

    // write client package values
    return await packageUtils.patch(dest, (json: any) => ({
        name: options?.packageName,
        templateType: undefined,
        dependencies: removeWorkspaceProtocol(json.dependencies),
        peerDependencies: removeWorkspaceProtocol(json.peerDependencies),
        devDependencies: removeWorkspaceProtocol(json.devDependencies),
    }));


    function removeWorkspaceProtocol(dependencies: object) {
        return dependencies && Object.fromEntries(
            Object.entries(dependencies).map(([key, value]: [string, string]) =>
                [key, value.startsWith("workspace:") ? value.substring("workspace:".length) : value]
            )
        );
    }
}


const TEMPLATE_PATH = "github:giuseppelt/httpc/templates/$TEMPLATE_NAME#master";

async function copyTemplate(templateName: string, dest: string): Promise<void> {
    if (process.env.LOCAL_TEMPLATE_ROOT) {
        const LOCAL_ROOT = process.env.LOCAL_TEMPLATE_ROOT;
        await fsUtils.copyDir(path.join(LOCAL_ROOT, templateName), dest, [
            "node_modules"
        ]);
        return;
    }

    log.verbose("Downloading template: %s", templateName);
    await downloadTemplate(TEMPLATE_PATH.replace("$TEMPLATE_NAME", templateName), {
        dir: dest,
    });
}
