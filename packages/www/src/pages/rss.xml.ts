import rss from "@astrojs/rss";
import { APIContext } from "astro";
import { getPosts } from "../content";


export async function get(context: APIContext) {
    const posts = await getPosts();

    return rss({
        title: "httpc blog",
        description: "Articles and best practices about httpc framework, node, typescript and API design",
        site: context.site!.toString(),
        stylesheet: "/rss-style.xsl",
        customData: "<language>en-us</language>",
        items: posts.map(x => ({
            link: "https://httpc.dev" + x.url,
            title: x.frontmatter.title,
            pubDate: x.frontmatter.publishedAt,
            description: x.frontmatter.summary || x.frontmatter.description,
            content: (x.frontmatter.summary || x.frontmatter.description)
                ? `
<p>${x.frontmatter.summary || x.frontmatter.description}</p>
<p><a href="https://httpc.dev${x.url}">Read more</a></p>
` : undefined
        }))
    })
}
