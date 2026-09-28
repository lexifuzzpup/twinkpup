import Elysia from "elysia";
import z from "zod";
import { ClientBoundMessage, MessageFlag, MessageType, ServerBoundMessage } from "./schema";
import auth from "../auth";
import type { UserView } from "../statements";

interface HoleSocket {
    id: string;
    data: {
        user: UserView | null
    };
    send(message: z.infer<ClientBoundMessage>): unknown;
    publish(channel:string, message: z.infer<ClientBoundMessage>): unknown;
}

function broadcast(ws: HoleSocket, channel: string, data: ClientBoundMessage) {
    ws.send(data);
    ws.publish(channel, data);
}

const sockets = new Map<string, HoleSocket>;

export default new Elysia()
    .use(auth)
    .ws("/thehole/ws", {
        cookie: z.object({
            token: z.string().optional()
        }),
        body: ServerBoundMessage,
        response: ClientBoundMessage,
        optionalAuth: true,
        beforeHandle({ cookie, user }) {
            const data = {
                user: user?.id ?? null
            };
        },
        open(ws) {
            ws.subscribe("thehole");
            sockets.set(ws.id, ws);

            broadcast(ws, "thehole", {
                type: MessageType.USER_CONNECT,
                id: ws.id,
                user: ws.data.user?.id ?? null
            });

            if(ws.data.user != null) {
                broadcast(ws, "thehole", {
                    type: MessageType.NEW_MESSAGE,
                    author: ws.data.user.id,
                    text: "",
                    time: new Date().getTime(),
                    flag: MessageFlag.USER_JOIN
                });
            }

            for(const otherWs of sockets.values()) {
                if(otherWs.data.user == null) continue;
                if(otherWs.id == ws.id) continue;

                ws.send({
                    type: MessageType.USER_CONNECT,
                    id: otherWs.id,
                    user: otherWs.data.user.id
                });
            }
        },
        close(ws, code, reason) {
            ws.unsubscribe("thehole");
            sockets.delete(ws.id);

            ws.publish("thehole", {
                type: MessageType.USER_DISCONNECT,
                id: ws.id,
            });

            if(ws.data.user != null) {
                ws.publish("thehole", {
                    type: MessageType.NEW_MESSAGE,
                    author: ws.data.user.id,
                    text: "",
                    time: new Date().getTime(),
                    flag: MessageFlag.USER_LEAVE
                });
            }
        },
        message(ws, message) {
            switch(message.type) {
                case "message": {
                    broadcast(ws, "thehole", {
                        type: MessageType.NEW_MESSAGE,
                        author: ws.data.user?.id ?? null,
                        text: message.text,
                        time: new Date().getTime(),
                        flag: MessageFlag.USER_MESSAGE
                    });
                } break;
            }
        },
    });