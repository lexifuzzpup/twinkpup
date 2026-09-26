import { use, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PublicUserView, UserView } from "../../statements";
import useWebSocket_ from "react-use-websocket";
import ScrollToBottom from "react-scroll-to-bottom";
import { BSON } from "bson";
import z from "zod";
import { Topbar } from "../topbar";

// https://github.com/oven-sh/bun/issues/3138#issuecomment-3429287309
const useWebSocket = (useWebSocket_ as any).default as typeof useWebSocket_;

createRoot(document.querySelector("#root")!).render(<Home />);

function Home() {
    const [meFetched, setMeFetched] = useState<boolean>(false);
    const [me, setMe] = useState<PublicUserView | null>(null);

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
        reloadMe();
    }, []);

    return (
        <>
            <div className="background"></div>

            <div style={{ display: "grid", gridTemplateRows: "max-content minmax(0, 1fr)", height: "100%" }}>
                <Topbar />
                <HoleChat />
            </div>
        </>
    );
}

const userCache = new Map<number, Promise<PublicUserView>>;

async function getUser(id: number | null) {
    if(id == null) return null;

    let user = userCache.get(id);
    if(user != null) return user;

    user = fetch("/api/user/" + id).then(response => {
        if(!response.ok) throw new Error(response.statusText);

        return response.json();
    }).catch((error) => {
        console.error("Failed to fetch user data for " + id, { cause: error });
        return null;
    });
    
    userCache.set(id, user);
    return user;
}

interface Member {
    id: string;
    user: PublicUserView | null;
}

interface Message {
    author: PublicUserView | null;
    text: string;
    time: Date;
}

const messageSchema = z.union([
    z.object({
        type: z.literal("message"),
        author: z.number().nullable(),
        text: z.string(),
        time: z.int()
    }),
    z.object({
        type: z.literal("user-join"),
        user: z.number().nullable(),
        id: z.string()
    }),
    z.object({
        type: z.literal("user-leave"),
        id: z.string()
    })
]);

function HoleChat() {
    const { sendMessage, lastMessage, readyState } = useWebSocket("/thehole/ws");
    const [ messageHistory, setMessageHistory ] = useState<Message[]>([]);
    const [ members, setMembers ] = useState<Member[]>([]);
    const [ inputText, setInputText ] = useState<string>("");

    useEffect(() => {
        if(lastMessage != null) {
            (async () => {
                const deserialized = BSON.deserialize(await lastMessage.data.arrayBuffer());
                const parsed = messageSchema.parse(deserialized);

                switch(parsed.type) {
                    case "message": {
                        const author = await getUser(parsed.author);
                        setMessageHistory(prev => prev.concat({
                            text: parsed.text,
                            time: new Date(parsed.time),
                            author
                        }));
                    } break;
                    case "user-join": {
                        const user = await getUser(parsed.user);
                        setMembers(prev => prev.concat({
                            id: parsed.id,
                            user
                        }));
                    } break;
                    case "user-leave": {
                        setMembers(prev => prev.filter(member => member.id != parsed.id));
                    } break;
                }
            })();
        }
    }, [ lastMessage ]);

    return (
        <div className="hole-chat">
            <fieldset className="chat">
                <legend>chat</legend>
                <ScrollToBottom className="history">
                    {messageHistory.map((message, i) => (
                        <li key={i}>
                            {
                                message.author == null
                                ? <span className="author" style={{ fontStyle: "italic" }}>anonymous</span>
                                : <span className="author">
                                    <a href={"/profile/" + message.author.id} target="_blank">{message.author.name}</a>
                                  </span>
                            }
                            <span className="time">{message.time.toLocaleDateString(navigator.language, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            })}</span>
                            <code>{message.text}</code>
                        </li>
                    ))}
                </ScrollToBottom>
                <form onSubmit={e => {
                    e.preventDefault();

                    if(inputText.trim().length > 0) {
                        sendMessage(BSON.serialize({
                            type: "message",
                            text: inputText
                        }));
                    }
                    
                    setInputText("");
                }}>
                    <input type="text" value={inputText} placeholder="send an instant message" onChange={event => setInputText(event.target.value)} maxLength={1000} />
                    <input type="submit" value="send" />
                </form>
            </fieldset>
            <fieldset className="members">
                <legend>members</legend>
                <ul>
                    {members
                        .filter(v => v.user != null)
                        .sort((a, b) => a.user!.name < b.user!.name ? 1 : -1)
                        .map(member => (
                            <li key={member.id}><a href={"/profile/" + member.user?.id} target="_blank">{member.user?.name}</a></li>
                        )
                    )}
                    {(() => {
                        const anons = members.filter(member => member.user == null);

                        if(anons.length == 0) return null;
                        return <li><i>{anons.length} {anons.length == 1 ? "anon" : "anons"}</i></li>
                    })()}
                </ul>
            </fieldset>
        </div>
    )
}