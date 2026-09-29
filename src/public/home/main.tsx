import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { NewPostForm, PostList } from "../posts";
import { PostingAsBanner } from "../user";
import { Topbar } from "../topbar";
import { PostView, PublicUserView } from "../../schema";
import { useNetworkJsonResource } from "../network";
import z from "zod";
import Oneko from "../oneko";

createRoot(document.querySelector("#root")!).render(<Home />);

function Home() {
    const visits = useNetworkJsonResource({
        url: "/api/visit",
        schema: z.object({ visits: z.int() }),
        fetchImmediately: false
    });
    const posts = useNetworkJsonResource({
        url: "/api/thread/1",
        schema: PostView.array()
    });
    const me = useNetworkJsonResource({
        url: "/api/user/me",
        schema: PublicUserView.nullable(),
        maxAttempts: 3,
        retryInterval: attempt => attempt * 500
    });

    useEffect(() => {
        fetch("/api/visit", { method: "POST" }).then(() => visits.reload());

        const interval = setInterval(() => {
            visits.reload();
            posts.reload();
        }, 10 * 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div className="background"></div>
            <Topbar />
            <Oneko />

            <span className="aware">
                this site has been visited <span className="aware">{visits.result?.visits ?? "..."}</span> time(s) !!
            </span>

            <fieldset>
                <legend className="super-aware">new post</legend>
                { me.loaded && <PostingAsBanner user={me.result} /> }
                <NewPostForm thread={1} onPosted={posts.reload} />
            </fieldset>

            <fieldset>
                <legend className="super-aware">recent posts</legend>

                { posts.loaded && <PostList posts={posts.result} /> }
            </fieldset>
        </>
    );
}