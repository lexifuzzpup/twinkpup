import { useState } from "react";

export interface PostDetails {
    id: number;
    author_id: number | null;
    author_name: string | null;
    time: number;
    content: string;
}

export function NewPostForm({ thread, onPosted }: { thread: number, onPosted: () => void }) {
    const [content, setContent] = useState("");

    return (
        <form className="new-post" onSubmit={async event => {
            event.preventDefault();

            const body = JSON.stringify({ content });
            setContent("");

            const request = await fetch("/api/thread/" + thread, { method: "POST", body });
            if(request.ok) {
                onPosted();
            }
        }}>
            <textarea required name="content" rows={16} cols={64} style={{ display: "block" }} maxLength={1000} autoComplete="off"
                placeholder="write your smutty confessions here"
                value={content} onChange={event => setContent(event.target.value)}></textarea>
            <input type="submit" value="Submit" />
        </form>
    );
}

export function PostList({ posts }: { posts: PostDetails[] }) {
    return (
        <div className="post-list">
            {posts.map(post => <Post key={post.id} post={post} />)}
        </div>
    );
}

export function Post({ post }: { post: PostDetails }) {
    const timestamp = new Date(post.time * 1000).toLocaleDateString(navigator.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });

    return (
        <fieldset className="post">
            {post.author_name == null
                ? <legend className="author" style={{ fontStyle: "oblique" }}>Anonymous</legend>
                : <legend className="author"><a href={"/profile/" + post.author_id}>{post.author_name}</a></legend>}
            <span className="timestamp">{timestamp}</span>
            <code>{post.content}</code>
        </fieldset>
    );
}
