import Elysia from "elysia";
import { findUserByToken } from "./statements";
import { SHA512 } from "bun";
import z from "zod";
import db from "./database";

export default new Elysia({ name: "auth" })
    .macro("optionalAuth", {
        resolve({ cookie: { token } }) {
            if(token.value == null) return { user: null };

            const user = findUserByToken.get(db, SHA512.hash(token.value, "base64"));

            return { user };
        },
        cookie: z.object({
            token: z.string().optional()
        })
    })
    .macro("requiredAuth", {
        resolve({ cookie: { token }, status }) {
            const user = findUserByToken.get(db, SHA512.hash(token.value, "base64"));
            if(user == null) return status(401, { error: "unauthorized" });

            return { user };
        },
        cookie: z.object({
            token: z.string()
        })
    })