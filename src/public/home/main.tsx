import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { NewPostForm, Post, PostList, type PostDetails } from "../posts";
import { PostingAsBanner, type UserDetails } from "../user";

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
        const request = await fetch("/api/thread/1");
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
                { meFetched && <PostingAsBanner user={me} /> }
                <NewPostForm thread={1} onPosted={reloadPosts} />
            </fieldset>

            <fieldset>
                <legend className="super-aware">recent posts</legend>

                <PostList posts={posts} />
            </fieldset>
        </>
    );
}