import type { AstroIntegration } from "astro";
import type { Root, Code } from "mdast";
import type { Element } from "hast";
import { visit, SKIP } from "unist-util-visit";



const LINE_ADD_REGEX = /(?:^|\s*)add=([0-9-,]+)(?:\s+|$)/;
const LINE_DEL_REGEX = /(?:^|\s*)del=([0-9-,]+)(?:\s+|$)*/;
const LINE_MARK_REGEX = /(?:^|\s*)mark=([0-9-,]+)(?:\s+|$)*/;


function parseMeta(value: string) {
    let title: string | undefined;
    const titleIdx = value.indexOf("title=");
    if (titleIdx >= 0) {
        if (value.charAt(titleIdx + 6) === "'") {
            const end = value.indexOf("'", titleIdx + 7);
            title = value.substring(titleIdx + 7, end === -1 ? undefined : end);
        } else if (value.charAt(titleIdx + 6) === "\"") {
            const end = value.indexOf("\"", titleIdx + 7);
            title = value.substring(titleIdx + 7, end === -1 ? undefined : end);
        } else {
            const end = value.indexOf(" ", titleIdx + 7);
            title = value.substring(titleIdx + 6, end === -1 ? undefined : end);
        }
    }


    const add = parseRange(value.match(LINE_ADD_REGEX)?.[1]);
    const del = parseRange(value.match(LINE_DEL_REGEX)?.[1]);
    const mark = parseRange(value.match(LINE_MARK_REGEX)?.[1]);

    return {
        title,
        add,
        del,
        mark
    };

    function parseRange(value: string | undefined) {
        value = value && value.trim();
        if (!value) return [];

        return value.split(",").flatMap(x => {
            if (!x.includes("-")) {
                return Number(x);
            }

            const [start, end] = x.split("-").map(x => Number(x));
            return [...Array(end - start + 1)].map((_, i) => i + start);
        });
    }
}


function enrichCode(info: ReturnType<typeof parseMeta>, codeElement: Element) {
    const lines = codeElement.children.filter((x: any) => x.type === "element" && (x.properties?.className as string[]).includes("line")) as Element[];

    lines.forEach((line, index) => {
        const lineNumber = index + 1;

        if (info.mark.includes(lineNumber)) {
            decorate(line, "mark");
        } else if (info.del.includes(lineNumber)) {
            decorate(line, "del");
        } else if (info.add.includes(lineNumber)) {
            decorate(line, "add");
        }
    });

    return codeElement;

    function decorate(line: Element, className: string) {
        (line.properties!.className as string[]).push(className);

        // edit empty lines as decorators aren't visible because the line height is 0
        if (line.children.length === 0) {
            // push a space, so the line has content and thus height
            line.children.push({
                type: "text",
                value: " "
            });
        }
    }
}

function rehypeCodeBlockDecorator() {
    return () => (tree: Root, file: any) => {
        visit(tree, "element", (node: Element) => {
            let children: any[] = node.children;
            if (node.tagName !== "pre" && children?.[0]?.tagName !== "code") {
                return;
            }

            let meta: string | undefined;
            const metaNode = children?.[0]?.children?.[0]?.children?.[0]?.children[0];
            if (metaNode && metaNode.type === "text" && metaNode.value.startsWith("// meta:")) {
                // remove node
                children?.[0].children.splice(0, 1);

                // remove eventual break
                if (children?.[0].children?.[0]?.value === "\n") {
                    children?.[0].children.splice(0, 1);
                }

                meta = metaNode.value.substring("// meta:".length).trim() || undefined;
            }

            if (!meta) {
                return [SKIP];
            }

            const info = parseMeta(meta as string);
            node.children[0] = enrichCode(info, node.children[0] as Element);

            if (!info.title) {
                return [SKIP];
            }

            const block = { ...node };
            const title: Element = {
                type: "element",
                tagName: "p",
                properties: {
                    className: "code-block-title"
                },
                children: [
                    {
                        type: "text",
                        value: info.title
                    }
                ]
            };

            // wrap with a code-block container
            node.tagName = "div";
            node.properties = {
                className: "code-block",
            };
            node.children = [
                title,
                block
            ];

            return [SKIP];
        });
    };
}

function remarkPreserveCodeMeta() {
    return () => (tree: Root) => {
        visit(tree, "code", (node: Code) => {
            node.value = `// meta: ${node.meta}\n${node.value}`;
        });
    };
}


export default (): AstroIntegration => {
    return {
        name: "code-decoration",
        hooks: {
            "astro:config:setup": ({ updateConfig }) => {
                updateConfig({
                    markdown: {
                        rehypePlugins: [
                            rehypeCodeBlockDecorator(),
                        ],
                        remarkPlugins: [
                            remarkPreserveCodeMeta()
                        ],
                    }
                });
            },
        }
    }
}
