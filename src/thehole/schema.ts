import z from "zod";

export enum MessageType {
    NEW_MESSAGE, USER_CONNECT, USER_DISCONNECT
}
export enum MessageFlag {
    USER_MESSAGE, USER_JOIN, USER_LEAVE
}

export const ClientBoundMessage = z.union([
    z.object({
        type: z.literal(MessageType.NEW_MESSAGE),
        author: z.number().nullable(),
        text: z.string(),
        time: z.int(),
        flag: z.enum(MessageFlag)
    }),
    z.object({
        type: z.literal(MessageType.USER_CONNECT),
        user: z.number().nullable(),
        id: z.string()
    }),
    z.object({
        type: z.literal(MessageType.USER_DISCONNECT),
        id: z.string()
    })
]);
export type ClientBoundMessage = z.infer<typeof ClientBoundMessage>;


export const ServerBoundMessage = z.union([
    z.object({
        type: z.literal("message"),
        text: z.string().trim().nonempty().max(1000)
    })
]);
export type ServerBoundMessage = z.infer<typeof ServerBoundMessage>;