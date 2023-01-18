
export interface ContentItem {
    frontmatter: Frontmatter
    url: string
}

export async function getDocs() {
    return await loadArticles(import.meta.glob("~/pages/docs/**/*.mdx"));
}

export async function getPosts() {
    const posts = (await loadArticles(import.meta.glob("~/pages/blog/*.mdx"))).map(x => ({
        ...x,
        frontmatter: {
            ...x.frontmatter,
            publishedAt: new Date(x.frontmatter.publishedAt!)
        }
    }));

    // sort from newest to oldest
    posts.sort((x, y) => y.frontmatter.publishedAt!.getTime() - x.frontmatter.publishedAt!.getTime());

    //
    // VALIDATIONS
    //
    for (const { frontmatter, url } of posts) {
        // ensure at least 1 tag
        const tags = frontmatter?.tags || [];
        if (tags.length === 0) {
            throw Error(`No tag specified in blog(${url})`);
        }

        // ensure existing tag
        const unknownTags = tags.filter(x => !BlogTags.includes(x));
        if (unknownTags.length > 0) {
            throw Error(`Unknown blog tags(${unknownTags.join()}) in ${url}. Please list it first in BlogTags.`);
        }
    }


    return posts;
}


export const BlogTags = [
    "announcements",
    "ergonomics",
    "patterns",
    "release",
    "typescript",
    "type-safety",
].sort();



async function loadArticles(glob: Record<string, () => Promise<any>>) {
    const files = await glob;
    const articles = (await Promise.all(
        Object.entries(files)
            .filter(([key]) => !key.endsWith("index.mdx")) // exclude index
            .map(([, loader]) => loader() as Promise<ContentItem>)
    )).filter(x => !x.frontmatter.draft); // exclude drafts

    return articles;
}
