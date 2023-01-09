
type Link = Readonly<{
    text: string
    href: string
}>

export type SidebarHeaderSection = {
    header: string
    links: readonly Link[]
}

export type SidebarLink = Readonly<
    | Link
    | SidebarHeaderSection
>


export function getNavLinks(current: string) {
    const allLinks = sidebar.flatMap((x) => ("header" in x ? x.links : x));
    const index = allLinks.findIndex(x => x.href === current);

    return {
        prev: index >= 0 && allLinks[index - 1]?.href || undefined,
        next: index >= 0 && allLinks[index + 1]?.href || undefined,
    };
}

const entries = import.meta.glob("~/pages/docs/tutorials/*.mdx");
const tutorials = (await Promise.all(
    Object.entries(entries)
        .filter(([key]) => !key.includes("tutorials/index.mdx")) // exclude index
        .map(([, loader]) => loader())
)).filter((x: any) => !x.frontmatter.draft);

const sidebar: readonly SidebarLink[] = [
    { text: "Introduction", href: "introduction" },
    { text: "Getting started", href: "getting-started" },
    {
        header: "Guides", links: [
            { text: "Index", href: "tutorials" },
            ...tutorials.map((x: any) => ({
                text: x.frontmatter.shortTitle || x.frontmatter.title,
                href: x.url.replace("/docs/", "")
            }))
        ]
    },
    {
        header: "Server", links: [
            { text: "Architecture", href: "server-architecture" },
            { text: "Extend functionality", href: "server-extending" },
            { text: "Request context", href: "server-request-context" },
            { text: "Call convention", href: "httpc-call-convention" },
            { text: "Testing", href: "server-testing" },
        ]
    },
    {
        header: "Kit", links: [
            { text: "Introduction", href: "kit-introduction" },
            { text: "Services & Dependency", href: "kit-dependency-injection" },
            { text: "Authentication", href: "kit-authentication" },
            { text: "Validation", href: "kit-validation" },
            { text: "Authorization", href: "kit-authorization" },
            { text: "Logging", href: "kit-logging" },
            { text: "Caching", href: "kit-caching" },
            { text: "Extending", href: "kit-extending" },
        ]
    },
    {
        header: "Client", links: [
            { text: "Generation", href: "client-generation" },
            { text: "Usage", href: "client-usage" },
            { text: "Publishing", href: "client-publishing" },
        ]
    },
    {
        header: "Adapters", links: [
            { text: "Vercel", href: "adapters/vercel" },
            { text: "Next", href: "adapters/next" },
            { text: "Netlify", href: "adapters/netlify" },
        ]
    },
    {
        header: "Packages", links: [
            { text: "@httpc/server", href: "package-httpc-server" },
            { text: "@httpc/client", href: "package-httpc-client" },
            { text: "@httpc/kit", href: "package-httpc-kit" },
            { text: "@httpc/cli", href: "package-httpc-cli" },
        ]
    }
];

export default sidebar;
