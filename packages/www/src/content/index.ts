import { getCollection, CollectionEntry } from "astro:content";

export type ContentItemDocs = CollectionEntry<"docs">
export type ContentItemBlog = CollectionEntry<"blog">
export { BlogTags } from "./config";


export type ContentItem =
    | ContentItemDocs
    | ContentItemBlog

export async function getDocs() {
    return await getCollection("docs", x => !x.data.draft);
}

export async function getPosts() {
    return (await getCollection("blog", x => !x.data.draft)).sort((x, y) => {
        // sort from newest to oldest
        return y.data.publishedAt.getTime() - x.data.publishedAt.getTime();
    });
}
