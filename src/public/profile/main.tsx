import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PublicUserView, type PostView } from "../../schema";
import { NewPostForm, PostList } from "../posts";
import { Topbar } from "../topbar";
import { PostingAsBanner } from "../user";
import { useNetworkJsonResource } from "../network";
import Oneko from "../oneko";

createRoot(document.querySelector("#root")!).render(<Home />);

function Home() {    
    const userId = document.location.pathname.split("/").pop();

    const me = useNetworkJsonResource({
        url: "/api/user/me",
        schema: PublicUserView.nullable(),
        maxAttempts: 3,
        retryInterval: attempt => attempt * 500
    });
    const viewingUser = userId && useNetworkJsonResource({
        url: "/api/user/" + userId,
        schema: PublicUserView,
        maxAttempts: 3,
        retryInterval: attempt => attempt * 500
    });

    return (
        <>
            <div className="background"></div>
            <Topbar />
            <Oneko />

            { viewingUser && me.loaded && viewingUser.loaded && <Profile me={me.result} user={viewingUser.result} /> }
        </>
    )
}

function Profile({ me, user }: { me: PublicUserView | null, user: PublicUserView }) {
    const [posts, setPosts] = useState<PostView[]>([]);
    const [editingBio, setEditingBio] = useState<boolean>(false);

    async function reloadPosts() {
        const request = await fetch("/api/thread/" + user.profile_thread);
        if(request.ok) {
            setPosts(await request.json());
        } else {
            console.error("Failed to load recent posts");
        }
    }

    useEffect(() => {
        reloadPosts();

        const interval = setInterval(() => {
            reloadPosts();
        }, 10 * 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <fieldset className="user-profile">
                <legend className="super-aware">{user.name}'s profile</legend>

                {
                    editingBio
                    ? <BioEditor
                        defaultBio={user.bio ?? ""}
                        onClose={() => setEditingBio(false)}
                        onSave={async (newBio) => {
                            const request = await fetch("/api/user/" + user.id, {
                                method: "PATCH",
                                body: JSON.stringify({ bio: newBio }),
                                headers: { "Content-Type": "application/json" }
                            });

                            if(request.ok) {
                                setEditingBio(false);
                                user.bio = newBio;
                            } else {
                                alert("an error happened !! look @ console 4 details");
                                console.error(request.status + " : " + request.statusText + ":\n" + await request.text());
                            }
                        }}
                    />
                    : <>
                        <code className="bio">{user.bio || "<no bio>"}</code>
                        { user.id == me?.id && <button onClick={() => setEditingBio(true)}>edit</button> }
                    </>
                }

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

function BioEditor({ defaultBio, onSave, onClose }: { defaultBio: string, onSave: (bio: string) => void, onClose: () => void }) {
    const [ bio, setBio ] = useState(defaultBio);

    return (
        <>
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={4000}></textarea>
            <button onClick={() => onSave(bio)}>save</button>
            <button onClick={() => onClose()}>cancel</button>
        </>
    )
}