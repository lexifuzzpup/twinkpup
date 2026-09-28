import Elysia from "elysia";
import z from "zod";
import { Repository } from "./database";

export default (repo: Repository) => new Elysia({ name: "auth" })
    .macro("optionalAuth", {
        resolve({ cookie: { token } }) {
            if(token.value == null) return { user: null };

            const user = repo.findUserByToken(token.value);

            return { user };
        },
        cookie: z.object({
            token: z.string().optional()
        })
    })
    .macro("requiredAuth", {
        resolve({ cookie: { token }, status }) {
            const user = repo.findUserByToken(token.value);
            if(user == null) return status(401, { error: "unauthorized" });

            return { user };
        },
        cookie: z.object({
            token: z.string()
        })
    })