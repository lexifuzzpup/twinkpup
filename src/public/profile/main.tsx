import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { NewPostForm, Post, PostList, type PostDetails } from "../posts";
import { PostingAsBanner, type UserDetails } from "../user";

createRoot(document.querySelector("#root")!).render(<Home />);

function Home() {
    const [meFetched, setMeFetched] = useState<boolean>(false);
    const [me, setMe] = useState<UserDetails | null>(null);
    const [viewingUser, setViewingUser] = useState<UserDetails | null>(null);

    const userId = document.location.pathname.split("/").pop();

    async function reloadMe() {
        const request = await fetch("/api/user/me");
        if(request.ok) {
            setMe(await request.json());
            setMeFetched(true);
        } else {
            console.error("Failed to load account notice");
        }
    }

    async function reloadViewingUser() {
        const request = await fetch("/api/user/" + userId);
        if(request.ok) {
            setViewingUser(await request.json());
        } else {
            console.error("Failed to load viewing account");
        }
    }

    useEffect(() => {
        Promise.all([
            reloadMe(),
            reloadViewingUser()
        ]);
    }, []);

    return (
        <>
            <div className="background"></div>
            <a href="/" className="super-aware">return home</a>
            { viewingUser && meFetched && <Profile me={me} user={viewingUser} /> }
        </>
    )
}

function Profile({ me, user }: { me: UserDetails | null, user: UserDetails }) {
    const [posts, setPosts] = useState<PostDetails[]>([]);

    async function reloadPosts() {
        const request = await fetch("/api/thread/" + user.profile_thread);
        if(request.ok) {
            setPosts(await request.json());
        } else {
            console.error("Failed to load recent posts");
        }
    }

    useEffect(() => {
        Promise.all([
            reloadPosts()
        ]);

        const interval = setInterval(() => {
            reloadPosts();
        }, 10 * 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <fieldset id="user-profile">
                <legend className="super-aware">{user.name}'s profile</legend>

                {
                    user.profile_thread ? <>
                        <fieldset>
                            <legend className="super-aware">talk about this person</legend>
                            <PostingAsBanner user={me} />
                            <NewPostForm thread={user.profile_thread} onPosted={reloadPosts} />
                        </fieldset>

                        <fieldset>
                            <legend className="super-aware">what people are saying</legend>

                            <PostList posts={posts} />
                        </fieldset>
                    </>
                    : <>
                        <i>this user does not have a profile thread (ὀ⌓ὀ⑅)</i>
                    </>
                }
            </fieldset>
        </>
    );
}