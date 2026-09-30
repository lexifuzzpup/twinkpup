import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import ScrollToBottom from "react-scroll-to-bottom";
import useWebSocket_ from "react-use-websocket";
import { PublicUserView } from "../../src/schema";
import { ClientBoundMessage, MessageFlag, MessageType } from "../../src/thehole/schema";
import { Topbar } from "../topbar";
import Oneko from "../oneko";
import { useSettingTheme } from "../settings";

// https://github.com/oven-sh/bun/issues/3138#issuecomment-3429287309
const useWebSocket = (useWebSocket_ as any).default as typeof useWebSocket_;

createRoot(document.querySelector("#root")!).render(<Home />);

function Home() {
    const [ theme ] = useSettingTheme();
    return (
        <div id="app" data-theme={theme}>
            <div className="background"></div>
            <Oneko />

            <div style={{ display: "grid", gridTemplateRows: "max-content minmax(0, 1fr)", height: "100%" }}>
                <Topbar />
                <HoleChat />
            </div>
        </div>
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
    flag: MessageFlag;
}

function AuthorCard({ user }: { user: PublicUserView | null }) {
    return user == null
        ? <span className="author" style={{ fontStyle: "italic" }}>anonymous</span>
        : <span className="author">
            <a href={"/profile/" + user.id} target="_blank">{user.name}</a>
          </span>
}
function Timestamp({ date }: { date: Date }) {
    return (
        <>{
            date.toLocaleDateString(navigator.language, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })
        }</>
    )
}

function HoleChat() {
    const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket("/thehole/ws", {
        reconnectInterval: attempt => attempt * 500,
        shouldReconnect: () => true
    });

    const [ messageHistory, setMessageHistory ] = useState<Message[]>([]);
    const [ members, setMembers ] = useState<Member[]>([]);
    const [ inputText, setInputText ] = useState<string>("");

    useEffect(() => {
        if(lastJsonMessage != null) {
            (async () => {
                const parsed = ClientBoundMessage.parse(lastJsonMessage);

                switch(parsed.type) {
                    case MessageType.NEW_MESSAGE: {
                        const author = await getUser(parsed.author);
                        setMessageHistory(prev => prev.concat({
                            text: parsed.text,
                            time: new Date(parsed.time),
                            flag: parsed.flag,
                            author
                        }));
                    } break;
                    case MessageType.USER_CONNECT: {
                        const user = await getUser(parsed.user);
                        setMembers(prev => prev.concat({
                            id: parsed.id,
                            user
                        }));
                    } break;
                    case MessageType.USER_DISCONNECT: {
                        setMembers(prev => prev.filter(member => member.id != parsed.id));
                    } break;
                }
            })();
        }
    }, [ lastJsonMessage ]);

    const classNames = {
        [ MessageFlag.USER_MESSAGE ]: "user-message",
        [ MessageFlag.USER_JOIN ]: "user-join",
        [ MessageFlag.USER_LEAVE ]: "user-leave"
    };

    return (
        <div className="hole-chat">
            <fieldset className="chat">
                <legend>chat</legend>
                <ScrollToBottom className="history">
                    {messageHistory.map((message, i) => (
                        <li key={i} className={"message " + classNames[message.flag]}>
                            {message.flag == MessageFlag.USER_MESSAGE && <>
                                <AuthorCard user={message.author} />
                                <span className="time"><Timestamp date={message.time} /></span>
                                <code>{message.text}</code>
                            </>}
                            {message.flag == MessageFlag.USER_JOIN && <>
                                <span className="content">
                                    <AuthorCard user={message.author} /> entered the hole !!
                                </span>
                                <span className="time"><Timestamp date={message.time} /></span>
                            </>}
                            {message.flag == MessageFlag.USER_LEAVE && <>
                                <span className="content">
                                    <AuthorCard user={message.author} /> left the hole...
                                </span>
                                <span className="time"><Timestamp date={message.time} /></span>
                            </>}
                        </li>
                    ))}
                </ScrollToBottom>
                <form onSubmit={e => {
                    e.preventDefault();

                    if(inputText.trim().length > 0) {
                        sendJsonMessage({
                            type: "message",
                            text: inputText
                        });
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