import { createClient, ClientDef } from "@httpc/client";
import { useQuery, useMutation } from "react-query";
import type calls from "../calls";


const client = createClient<ClientDef<typeof calls>>();

export default function Home() {
  const posts = useQuery(["posts"], () => client.posts.getLatest());
  const addLike = useMutation((postId: string) => client.posts.addLike(postId), {
    onSuccess: () => queryClient.invalidateQueries(["posts"])
  });

  return (
    <div class="container">
      {posts.data.map(post =>
        <div class="post">
          <h2>{post.title}</h2>
          <button onClick={() => addLike.mutate(post.id)}>Like</button>
        </div>
      )}
    </div>
  );
}
