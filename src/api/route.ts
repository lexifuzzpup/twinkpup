import Elysia from "elysia";
import auth from "../auth";
import * as statements from "../statements";
import db from "../database";
import { password, SHA512 } from "bun";
import z from "zod";

function createSessionForUser(userId: number) {
    const token = crypto.getRandomValues(new Uint8Array(128)).toBase64();
    const tokenHash = SHA512.hash(token, "base64");
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 3);

    statements.createSession.run(db, { $token: tokenHash, $user: userId, $expires_on: expireDate.toISOString() });

    return { token, expireDate };
}
function deleteSession(token: string) {
    statements.deleteSession.run(db, SHA512.hash(token, "base64"));
}

export default new Elysia()
    .use(auth)
    .get("/visit", () => {
        return statements.getVisitCount.get(db);
    })
    .post("/visit", () => {
        statements.createVisit.run(db, new Date().toISOString());

        return statements.getVisitCount.get(db);
    })

    .get("/thread/:threadId", async ({ params }) => {
        const posts = statements.findPostsInThread.all(db, {
            $thread: +params.threadId, $limit: 20 });

        return posts;
    })
    .post("/thread/:threadId", async ({ body, params, user }) => {
        const postResult = statements.createPost.run(db, {
            $time: new Date().toISOString(),
            $author: user?.id ?? null,
            $content: body.content,
            $thread: +params.threadId
        });

        const post = statements.findPostById.get(db, postResult.lastInsertRowid as number);
        
        if(post == null) return Response.json(null, { status: 404 });
        return post;
    }, {
        body: z.object({
            content: z.string().trim().nonempty().max(1000)
        }),
        optionalAuth: true
    })

    .get("/user/me", async ({ user }) => {
        if(user == null) return Response.json(null, { status: 401 });
        return user;
    }, {
        optionalAuth: true
    })
    
    .get("/user/:userId", async ({ params: { userId } }) => {
        const user = statements.findUserById.get(db, +userId);

        if(user == null) return Response.json(null, { status: 404 });
        return user;
    })
    .patch("/user/:userId", async ({ params: { userId }, status, body, user }) => {
        if(user.id.toString() != userId) {
            return status(403, { error: "forbidden" });
        }

        if(body.bio != null) {
            statements.setUserBio.run(db, { $id: +userId, $bio: body.bio });
        }

        return body;
    }, {
        body: z.object({
            // username: z.string().optional(),
            bio: z.string().max(4000).optional(),
        }),
        requiredAuth: true
    })

    .post("/register", async ({ body, status, cookie }) => {
        if(body.username.length < 4 || body.username.length > 50) {
            return status(400, { error: "username_length", min: 4, max: 50 });
        }
        if(body.password.length < 6) {
            return status(400, { error: "password_length", min: 6 });
        }

        if(/[^A-Za-z0-9\-_\.]/g.test(body.username)) {
            return status(400, { error: "invalid_username" });
        }
        
        if(statements.isUsernameTaken.get(db, body.username)) {
            return status(400, { error: "username_taken" });
        }

        const hash = await password.hash(body.password);

        const loginResult = statements.createPasswordLogin.run(db, {
            $hash: hash,
            $creation_time: new Date().toISOString()
        });
        const registerResult = statements.createUser.run(db, {
            $name: body.username,
            $login: loginResult.lastInsertRowid as number,
            $creation_time: new Date().toISOString()
        });

        const user = statements.findUserById.get(db, registerResult.lastInsertRowid as number)!;

        const session = createSessionForUser(user.id);
        const token = cookie.token;
        token.value = session.token;
        token.expires = session.expireDate;
        token.secure = true;

        return user;
    }, {
        body: z.object({
            username: z.string().nonempty(),
            password: z.string().nonempty()
        }),
        optionalAuth: true // adds the "token" cookie
    })
    
    .post("/login", async ({ body, status, cookie }) => {
        const login = statements.findLoginByUserName.get(db, body.username);
        if(login == null) {
            return status(404, { error: "unknown_user" });
        }

        if(login.password != null) {
            const success = await password.verify(body.password, login.password);

            if(!success) return status(401, { error: "invalid_password" });
        } else {
            return status(400, { error: "unknown_auth_type" });
        }

        const session = createSessionForUser(login.user_id);
        const token = cookie.token;
        token.value = session.token;
        token.expires = session.expireDate;
        token.secure = true;

        return { token: session.token };
    }, {
        body: z.object({
            username: z.string().nonempty(),
            password: z.string().nonempty()
        }),
        optionalAuth: true // adds the "token" cookie
    })

    .post("/logout", async ({ cookie: { token } }) => {
        deleteSession(token.value);
        token.remove();

        return { success: true };
    }, {
        requiredAuth: true
    })