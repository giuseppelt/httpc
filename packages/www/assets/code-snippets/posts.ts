type Post = {
    id: string
    title: string
}

interface Comment {

}

interface Client {
    posts: {
        getAll(): Promise<Post[]>
        addComment(postId: string, comment: Comment): Promise<Comment>
    }
}

function AuthHeader(...args: any) { }
function createClient(options: any): Client {
    return null!;
}



async function main() {

    const client = createClient({ endpoint: "https://api.super-service.com" });

    const posts = await client.posts.getAll();
    const newComment = await client.posts.addComment({
        text: "hello world"
    });
}
