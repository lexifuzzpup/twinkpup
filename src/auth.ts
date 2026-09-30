import Elysia from "elysia";
import z from "zod";
import { Repository } from "./database";
import { UserView } from "./schema";

function isInPast(date: Date) {
    return date.getTime() < new Date().getTime();
}

export default (repo: Repository) => new Elysia({ name: "auth" })
    .macro("optionalAuth", {
        resolve({ cookie: { token } }): { user: UserView | null } {
            if(token.value == null) return { user: null };

            const user = repo.findUserByToken(token.value);
            if(user == null) {
                token.remove();
                return { user: null };
            }

            if(isInPast(user.token_expires_on)) {
                repo.deleteSession(token.value);
                token.remove();
                return { user: null };
            }

            return { user: UserView.parse(user) };
        },
        cookie: z.object({
            token: z.string().optional()
        })
    })
    .macro("requiredAuth", {
        resolve({ cookie: { token }, status }) {
            const user = repo.findUserByToken(token.value);
            if(user == null) return status(401, { error: "unauthorized" });

            if(isInPast(user.token_expires_on)) {
                repo.deleteSession(token.value);
                token.remove();
                return status(401, { error: "token_expired" });
            }

            return { user: UserView.parse(user) };
        },
        cookie: z.object({
            token: z.string()
        })
    })