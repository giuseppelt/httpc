import fs from "fs/promises";
import path from "path";
import { HttpCallDefinition, HttpCClientMetadata } from "@httpc/client";


type HttpCallPipelineDefinition = {
    access: HttpCallDefinition["access"]
    metadata?: Record<string, any>
}

function isCallHidden(call: any): boolean {
    return !!call?.metadata?.["httpc:hidden"];
}

function generateMetadataForFunction(): HttpCallDefinition {
    return {
        access: "write"
    };
}

function generateMetadataForPipeline(call: HttpCallPipelineDefinition): HttpCallDefinition {
    return {
        access: call.access || undefined,
        metadata: filterClientMetadata(call.metadata) || undefined
    };
}

function generateMetadata(callTree: any): HttpCClientMetadata {
    if (!callTree) return {};

    return Object.fromEntries(
        Object.entries(callTree).map(([name, call]) => {
            if (typeof call === "function") { // a basic function handler
                return [name, generateMetadataForFunction()];
            } else if (call && typeof call === "object" && "execute" in call && typeof (call as any)["execute"] === "function") {
                if (isCallHidden(call)) {
                    return [name, undefined];
                } else {
                    return [name, generateMetadataForPipeline(call as any as HttpCallPipelineDefinition)]
                }
            } else {
                return [name, generateMetadata(call)];
            }
        })
    );
}

const CLIENT_METADATA_PREFIX = "httpc-client:";

function filterClientMetadata(metadata?: Record<string, any>) {
    if (!metadata) return;

    return Object.fromEntries(
        Object.entries(metadata)
            .filter(([key]) => key.startsWith(CLIENT_METADATA_PREFIX))
            .map(([key, value]) => [key.substring(CLIENT_METADATA_PREFIX.length), value])
    );
}

function cleanUndefined(object: any) {
    return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

export async function writeMetadata(object: any, destination: string) {
    const metadata = generateMetadata(object);
    await fs.writeFile(path.join(destination, "metadata.json"), JSON.stringify(metadata), "utf-8");
}
