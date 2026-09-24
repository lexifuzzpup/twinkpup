import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

interface PostDetails {
    id: number;
    author_id: number;
    author_name: string | null;
    time: number;
    content: string;
}

interface UserDetails {
    id: number;
    name: string;
}

createRoot(document.querySelector("#root")!).render(<Home />);

function Home() {
    const [visits, setVisits] = useState<number | null>(null);
    const [posts, setPosts] = useState<PostDetails[]>([]);
    const [meFetched, setMeFetched] = useState<boolean>(false);
    const [me, setMe] = useState<UserDetails | null>(null);

    async function reloadVisitCounter() {
        const request = await fetch("/api/visit");
        if(request.ok) {
            const response = await request.json();
            setVisits(response.visits);
        } else {
            console.error("Failed to load visit counter");
        }
    }

    async function reloadPosts() {
        const request = await fetch("/api/posts");
        if(request.ok) {
            setPosts(await request.json());
        } else {
            console.error("Failed to load recent posts");
        }
    }

    async function reloadMe() {
        const request = await fetch("/api/user/me");
        if(request.ok) {
            setMe(await request.json());
            setMeFetched(true);
        } else {
            console.error("Failed to load account notice");
        }
    }

    useEffect(() => {
        (async () => {
            await fetch("/api/visit", { method: "POST" });

            await reloadVisitCounter();
            await reloadPosts();
            await reloadMe();
        })();

        const interval = setInterval(() => {
            reloadVisitCounter();
            reloadPosts();
        }, 10 * 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div className="background"></div>
            <span className="aware">
                this site has been visited <span className="aware">{visits ?? "..."}</span> time(s) !!
            </span>

            <fieldset>
                <legend className="super-aware">new post</legend>
                { meFetched && <AccountNotice user={me} /> }
                <NewPostForm onPosted={reloadPosts} />
            </fieldset>

            <fieldset>
                <legend className="super-aware">recent posts</legend>

                <div className="post-list">
                    {posts.map(post => <Post key={post.id} post={post} />)}
                </div>
            </fieldset>
        </>
    );
}

function AccountNotice({ user }: { user: UserDetails | null }) {
    return (
        <div className="account-notice" style={{ color: "#f0f" }}>
            { user == null
                ? <>
                    you are posting as the elusive <span className="aware">ANONYMOUS</span>..
                    {" "}
                    <a href="/account/login">log in</a> or <a href="/account/register">create account</a>
                </>
                : <>
                    you are logged in as <span className="aware">{user.name}</span> !!
                    (or <a href="/account/logout">log out</a>)
                </>
            }
        </div>
    );
}

function NewPostForm({ onPosted }: { onPosted: () => void }) {
    const [content, setContent] = useState("");

    return (
        <form className="new-post" onSubmit={async event => {
            event.preventDefault();

            const body = JSON.stringify({ content });
            setContent("");

            const request = await fetch("/api/posts", { method: "POST", body });
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

function Post({ post }: { post: PostDetails }) {
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
                : <legend className="author">{post.author_name}</legend>}
            <span className="timestamp">{timestamp}</span>
            <code>{post.content}</code>
        </fieldset>
    );
}
