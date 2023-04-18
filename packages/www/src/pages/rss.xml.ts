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
            link: "https://httpc.dev/blog/" + x.slug,
            title: x.data.title,
            pubDate: x.data.publishedAt,
            description: x.data.summary || x.data.description,
            content: (x.data.summary || x.data.description)
                ? `
<p>${x.data.summary || x.data.description}</p>
<p><a href="https://httpc.dev/blog/${x.slug}">Read more</a></p>
` : undefined
        }))
    })
}
