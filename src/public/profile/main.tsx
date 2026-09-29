import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PostView, PublicUserView } from "../../schema";
import { useNetworkJsonResource } from "../network";
import Oneko from "../oneko";
import { NewPostForm, PostList } from "../posts";
import { useOnekoEnabled } from "../settings";
import { Topbar } from "../topbar";
import { PostingAsBanner } from "../user";

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
    const [editingBio, setEditingBio] = useState<boolean>(false);

    const posts = useNetworkJsonResource({
        url: "/api/thread/" + user.profile_thread,
        schema: PostView.array(),
        seamless: true
    });

    useEffect(() => {
        const interval = setInterval(() => {
            posts.reload();
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
                            <NewPostForm thread={user.profile_thread} onPosted={posts.reload} />
                        </fieldset>

                        <fieldset>
                            <legend className="super-aware">what people are saying</legend>

                            { posts.loaded && <PostList posts={posts.result} /> }
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