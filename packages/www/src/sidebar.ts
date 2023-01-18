import { BlogTags, getDocs, getPosts } from "./content";


type Link = Readonly<{
    text: string
    href: string
    frontmatter?: Frontmatter
    navigable?: "disabled"
}>

export type SidebarHeaderSection = {
    open?: boolean
    className?: string
    header: string
    links: readonly Link[]
    navigable?: "disabled"
}

export type SidebarLink = Readonly<
    | Link
    | SidebarHeaderSection
>


async function createSidebar(links: SidebarLink[] | (() => (SidebarLink[] | Promise<SidebarLink[]>))) {
    if (typeof links === "function") {
        links = await links();
    }


    const pages = links.filter(x => x.navigable !== "disabled")
        .flatMap((x) => ("header" in x ? x.links : x))
        .filter(x => x.navigable !== "disabled");

    return {
        entries: links,
        getNavLinks(current: string) {
            const idx = pages.findIndex(x => x.href === current);

            return {
                prev: idx >= 0 && pages[idx - 1] || undefined,
                next: idx >= 0 && pages[idx + 1] || undefined,
            };
        }
    } as const;
}

export type Sidebar = Awaited<ReturnType<typeof createSidebar>>

const DocsSidebar = () => createSidebar(async () => {
    const articles = await getDocs();
    const tutorials = articles.filter(x => x.url.includes("/tutorials/"));

    function docLink(path: string): Link {
        path = "/docs/" + path;
        const item = articles.find(x => x.url === path);
        if (!item) throw new Error(`Sidebar: doc(${path}) not found`);

        return {
            text: item.frontmatter.shortTitle || item.frontmatter.title,
            href: path,
            frontmatter: item.frontmatter
        };
    }

    return [
        docLink("introduction"),
        docLink("getting-started"),
        {
            header: "Guides", links: [
                { text: "Index", href: "/docs/tutorials", frontmatter: { title: "Guides & Tutorials" } },
                ...(tutorials.map(x => ({
                    text: x.frontmatter.shortTitle || x.frontmatter.title,
                    href: x.url,
                })))
            ]
        },
        {
            header: "Server", links: [
                docLink("server-architecture"),
                docLink("server-extending"),
                docLink("server-request-context"),
                docLink("httpc-call-convention"),
                docLink("server-testing"),
            ]
        },
        {
            header: "Kit", links: [
                docLink("kit-introduction"),
                docLink("kit-dependency-injection"),
                docLink("kit-authentication"),
                docLink("kit-validation"),
                docLink("kit-authorization"),
                docLink("kit-logging"),
                docLink("kit-caching"),
                docLink("kit-extending"),
            ]
        },
        {
            header: "Client", links: [
                docLink("client-generation"),
                docLink("client-usage"),
                docLink("client-publishing"),
            ]
        },
        {
            header: "Adapters", links: [
                docLink("adapters/vercel"),
                docLink("adapters/next"),
                docLink("adapters/netlify"),
            ]
        },
        {
            header: "Packages", links: [
                docLink("package-httpc-server"),
                docLink("package-httpc-client"),
                docLink("package-httpc-kit"),
                docLink("package-httpc-cli"),
            ]
        }
    ];
});


const BlogSidebar = () => createSidebar(async () => {
    const posts = await getPosts();
    const latest = posts.slice(0, 5);

    return [
        { text: "Index", href: "/blog/", navigable: "disabled" },
        {
            header: "Latest", open: true, links: latest.map(x => ({
                text: x.frontmatter.shortTitle || x.frontmatter.title,
                href: x.url,
                frontmatter: x.frontmatter,
            }))
        },
        {
            header: "Tags", open: true, className: "tag-cloud", navigable: "disabled", links: BlogTags.map(x => ({
                text: x, href: `/blog/tags/${x}`
            }))
        }
    ];
});

const _sidebars = {} as any;
export async function getSidebar(which: "docs" | "blog"): Promise<Sidebar> {
    if (_sidebars[which]) return await (_sidebars[which]);

    if (which === "docs") return await (_sidebars[which] = DocsSidebar());
    if (which === "blog") return await (_sidebars[which] = BlogSidebar());

    throw new Error("Invalid sidebar: " + which);
}
