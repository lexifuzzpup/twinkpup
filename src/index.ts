import { password, serve, SHA512 } from "bun";
import { migrate, migrations } from "bun-migrate";
import { Database } from "bun:sqlite";
import crypto from "crypto";
import z from "zod";

import account_login from "./public/account/login/index.html";
import account_register from "./public/account/register/index.html";
import home_index from "./public/home/index.html";
import profile_index from "./public/profile/index.html";
import * as statements from "./statements";

const developmentEnabled = process.env.NODE_ENV?.toLowerCase() == "development";

function getDb() {
    const db = new Database("/usr/db/mydb.sqlite", {
        create: true
    });
    db.run("PRAGMA foreign_keys = ON");
    return db;
}

const migrationDb = getDb();
migrationDb.run("PRAGMA foreign_keys = OFF");
await migrate(migrationDb, {
    migrations: (await migrations("src/migrations")).sort((a, b) => a.id - b.id),
    log: true
});

const userContentSchema = {
    NEW_POST: z.object({
        content: z.string().nonempty()
    }),
    NEW_USER: z.object({
        username: z.string().nonempty(),
        password: z.string().nonempty()
    }),
    LOGIN: z.object({
        username: z.string().nonempty(),
        password: z.string().nonempty()
    }),
    PATCH_USER: z.object({
        // username: z.string().optional(),
        bio: z.string().optional(),
    })
};

function createSessionForUser(db: Database, userId: number) {
    const token = crypto.getRandomValues(new Uint8Array(128)).toBase64();
    const tokenHash = SHA512.hash(token, "base64");
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 3);

    statements.createSession.run(db, { $token: tokenHash, $user: userId, $expires_on: expireDate.toISOString() });

    return { token, expireDate };
}

const server: Bun.Server<{ user: number | null }> = serve({
    development: developmentEnabled,
    routes: {
        "/": home_index,
        "/account/register": account_register,
        "/account/login": account_login,
        "/profile/:userId": profile_index,

        "/account/logout": async req => {
            using db = getDb();

            const token = req.cookies.get("token");
            if(token != null) {
                statements.deleteSession.run(db, SHA512.hash(token, "base64"));
            }

            req.cookies.delete("token");
            return Response.redirect("/");
        },

        "/api/visit": {
            async GET() {
                using db = getDb();
                return Response.json(statements.getVisitCount.get(db));
            },
            async POST() {
                using db = getDb();
                statements.createVisit.run(db, new Date().toISOString());

                return Response.json(statements.getVisitCount.get(db));
            }
        },
        "/api/thread/:threadId": {
            async GET(req) {
                using db = getDb();

                const posts = statements.findPostsInThread.all(db, {
                    $thread: +req.params.threadId, $limit: 20 });
                return Response.json(posts);
            },
            async POST(req) {
                const rawData = await req.json();
                let payload: z.infer<typeof userContentSchema.NEW_POST>;
                try {
                    payload = userContentSchema.NEW_POST.parse(rawData);
                } catch(e) {
                    return new Response("Schema mismatch", { status: 422 })
                }
                
                using db = getDb();

                const token = req.cookies.get("token");
                const user: statements.UserView | null = token == null ? null : statements.findUserByToken.get(db, SHA512.hash(token, "base64"));

                const postResult = statements.createPost.run(db, {
                    $time: new Date().toISOString(),
                    $author: user?.id ?? null,
                    $content: payload.content,
                    $thread: +req.params.threadId
                });

                const post = statements.findPostById.get(db, postResult.lastInsertRowid as number);
                
                return Response.json(post);
            }
        },
        "/api/user/me": async req => {
            const token = req.cookies.get("token");
            
            if(token == null) {
                return Response.json(null);
            }
            
            using db = getDb();
            const user = statements.findUserByToken.get(db, SHA512.hash(token, "base64"));
            return Response.json(user);
        },
        "/api/user/:id": {
            async GET(req) {
                using db = getDb();
                const user = statements.findUserById.get(db, +req.params.id);

                if(user == null) return Response.json(null, { status: 404 });
                return Response.json(user);
            },
            async PATCH(req) {
                const rawData = await req.json();
                let payload: z.infer<typeof userContentSchema.PATCH_USER>;
                try {
                    payload = userContentSchema.PATCH_USER.parse(rawData);
                } catch(e) {
                    return new Response("Schema mismatch", { status: 422 })
                }

                using db = getDb();

                const token = req.cookies.get("token");
                const user: statements.UserView | null = token == null ? null : statements.findUserByToken.get(db, SHA512.hash(token, "base64"));

                if(user?.id.toString() != req.params.id) {
                    return new Response("Forbidden", { status: 403 });
                }

                if(payload.bio != null) {
                    statements.setUserBio.run(db, { $id: +req.params.id, $bio: payload.bio });
                }

                return new Response();
            }
        },
        "/api/register": {
            async POST(req) {
                const rawData = await req.json();
                let payload: z.infer<typeof userContentSchema.NEW_USER>;
                try {
                    payload = userContentSchema.NEW_USER.parse(rawData);
                } catch(e) {
                    return new Response("Schema mismatch", { status: 422 })
                }

                if(payload.username.length < 4 || payload.username.length > 50) {
                    return Response.json(
                        { error: "username_length", min: 4, max: 50 },
                        { status: 400 }
                    );
                }
                if(payload.password.length < 6) {
                    return Response.json(
                        { error: "password_length", min: 6 },
                        { status: 400 }
                    );
                }

                if(/[^A-Za-z0-9\-_\.]/g.test(payload.username)) {
                    return Response.json(
                        { error: "invalid_username" },
                        { status: 400 }
                    )
                }

                using db = getDb();

                if(statements.isUsernameTaken.get(db, payload.username)) {
                    return Response.json(
                        { error: "username_taken" },
                        { status: 400 }
                    );
                }

                const hash = await password.hash(payload.password);

                const loginResult = statements.createPasswordLogin.run(db, {
                    $hash: hash,
                    $creation_time: new Date().toISOString()
                });
                const registerResult = statements.createUser.run(db, {
                    $name: payload.username,
                    $login: loginResult.lastInsertRowid as number,
                    $creation_time: new Date().toISOString()
                });

                const user = statements.findUserById.get(db, registerResult.lastInsertRowid as number)!;

                const session = createSessionForUser(db, user.id);
                req.cookies.set("token", session.token, { expires: session.expireDate });

                return Response.json(user);
            }
        },
        "/api/login": {
            async POST(req) {
                const rawData = await req.json();
                let payload: z.infer<typeof userContentSchema.LOGIN>;
                try {
                    payload = userContentSchema.LOGIN.parse(rawData);
                } catch(e) {
                    return new Response("Schema mismatch", { status: 422 })
                }

                using db = getDb();
                const login = statements.findLoginByUserName.get(db, payload.username);
                if(login == null) {
                    return Response.json(
                        { error: "unknown_user" },
                        { status: 404 }
                    );
                }

                if(login.password != null) {
                    const success = await password.verify(payload.password, login.password);

                    if(!success) {
                        return Response.json(
                            { error: "invalid_password" },
                            { status: 401 }
                        );
                    }
                } else {
                    return Response.json(
                        { error: "unknown_auth_type" },
                        { status: 400 }
                    );
                }

                const session = createSessionForUser(db, login.user_id);
                req.cookies.set("token", session.token, { expires: session.expireDate });

                return Response.json({ token: session.token });
            }
        }
    }
})

console.log(`Server running at ${server.url}`);