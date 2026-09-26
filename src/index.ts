import { password, serve, SHA512, type ServerWebSocket } from "bun";
import { migrate, migrations } from "bun-migrate";
import { Database } from "bun:sqlite";
import crypto from "crypto";
import z from "zod";

import { mkdirSync } from "fs";
import path from "path";
import account_login from "./public/account/login/index.html";
import account_register from "./public/account/register/index.html";
import hole_index from "./public/hole/index.html";
import home_index from "./public/home/index.html";
import profile_index from "./public/profile/index.html";
import * as statements from "./statements";
import { WebSocketRoute, type WebSocketData } from "./websockets";
import { BSON } from "bson";

const developmentEnabled = process.env.NODE_ENV?.toLowerCase() == "development";
const dbLocation = process.env.SQLITE_DB_FILE;

if(dbLocation == null) throw new Error("SQLITE_DB_FILE is not set");

mkdirSync(path.dirname(dbLocation), { recursive: true });

function getDb() {
    const db = new Database(dbLocation, {
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
        content: z.string().trim().nonempty().max(1000)
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
        bio: z.string().max(4000).optional(),
    }),
    THE_HOLE_MESSAGE: z.union([
        z.object({
            type: z.literal("message"),
            text: z.string().trim().nonempty().max(1000)
        })
    ])
};

const theHoleRoute = new class extends WebSocketRoute {
    public override open(ws: ServerWebSocket<WebSocketData>): void {
        super.open(ws);

        this.broadcast(BSON.serialize({
            type: "user-join",
            id: ws.data.id,
            user: ws.data.user
        }), false, otherWs => otherWs != ws);

        for(const otherWs of this.getAll()) {
            ws.send(BSON.serialize({
                type: "user-join",
                id: otherWs.data.id,
                user: otherWs.data.user
            }));
        }
    }
    public override close(ws: ServerWebSocket<WebSocketData>, code: number, reason: string): void {
        super.close(ws, code, reason);

        this.broadcast(BSON.serialize({
            type: "user-leave",
            id: ws.data.id,
        }));
    }
    public override message(ws: ServerWebSocket<WebSocketData>, message: string | Buffer<ArrayBuffer>): void {
        super.message(ws, message);

        const deserialized = BSON.deserialize(message as Buffer);
        const parsed = userContentSchema.THE_HOLE_MESSAGE.parse(deserialized);

        switch(parsed.type) {
            case "message": {
                this.broadcast(BSON.serialize({
                    type: "message",
                    author: ws.data.user,
                    text: parsed.text,
                    time: new Date().getTime()
                }));
            } break;
        }
    }
}

function createSessionForUser(db: Database, userId: number) {
    const token = crypto.getRandomValues(new Uint8Array(128)).toBase64();
    const tokenHash = SHA512.hash(token, "base64");
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 3);

    statements.createSession.run(db, { $token: tokenHash, $user: userId, $expires_on: expireDate.toISOString() });

    return { token, expireDate };
}

const server: Bun.Server<WebSocketData> = serve({
    development: developmentEnabled,
    routes: {
        "/": home_index,
        "/account/register": account_register,
        "/account/login": account_login,
        "/profile/:userId": profile_index,
        "/thehole": hole_index,

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
        },

        "/thehole/ws": async req => {
            using db = getDb();

            const token = req.cookies.get("token");
            const user: statements.UserView | null = token == null ? null : statements.findUserByToken.get(db, SHA512.hash(token, "base64"));

            const data = {
                user: user?.id ?? null,
                req: req,
                router: theHoleRoute
            };
            if(!server.upgrade(req, { data })) {
                return new Response("Upgrade failed", { status: 500 });
            }
        }
    },
    websocket: {
        message(ws, message) {
            ws.data.router.message(<any>ws, message);
        },
        open(ws) {
            ws.data.router.open(<any>ws);
        },
        close(ws, code, reason) {
            ws.data.router.close(<any>ws, code, reason);
        }
    }
});

console.log(`Server running at ${server.url}`);