import { password, serve, SHA512 } from "bun";
import crypto from "crypto";
import { Database } from "bun:sqlite";
import { migrate, migrations } from "bun-migrate";
import z from "zod";

import home_index from "./public/home/index.html";
import account_register from "./public/account/register/index.html";
import account_login from "./public/account/login/index.html";
import profile_index from "./public/profile/index.html";

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
const statements = {
    GET_VISIT_COUNT: "SELECT COUNT(time) AS visits FROM visits",
    NEW_VISIT: "INSERT INTO visits(time) VALUES(CURRENT_TIMESTAMP)",
    GET_POSTS: `
        SELECT p.id,
                UNIXEPOCH(p.time) AS time,
                p.author AS author_id,
                u.name AS author_name,
                p.content
        FROM posts p
        LEFT JOIN users u ON p.author = u.id
        ORDER BY time DESC
        LIMIT 20
    `,
    GET_THREAD_POSTS: `
        SELECT p.id,
                UNIXEPOCH(p.time) AS time,
                p.author AS author_id,
                u.name AS author_name,
                p.content
        FROM posts p
        LEFT JOIN users u ON p.author = u.id
        WHERE p.thread = $thread
        ORDER BY time DESC
        LIMIT $limit
    `,
    NEW_ANONYMOUS_POST: `
        INSERT INTO posts(time, content, thread)
        VALUES(CURRENT_TIMESTAMP, $content, $thread)
    `,
    NEW_USER_POST: `
        INSERT INTO posts(time, author, content, thread)
        VALUES(CURRENT_TIMESTAMP, $author, $content, $thread)
    `,
    GET_POST_BY_ID: "SELECT * FROM posts WHERE id = ?",
    NEW_LOGIN_PASSWORD: `
        INSERT INTO logins(password)
        VALUES(?)
    `,
    NEW_USER: `
        INSERT INTO users(name, login)
        VALUES($name, $login)
    `,
    GET_USER_INFO_BY_ID: "SELECT id, name, profile_thread, bio FROM users WHERE id = ?",
    FIND_USER_LOGIN: "SELECT * FROM users WHERE name = ?",
    GET_LOGIN_BY_ID: "SELECT * FROM logins WHERE id = ?",
    NEW_SESSION: `
        INSERT INTO sessions(token, user, expires_on)
        VALUES($token, $user, $expires_on)
    `,
    DELETE_SESSION_BY_TOKEN: `
        DELETE FROM sessions
        WHERE token = ?
    `,
    FIND_USER_BY_TOKEN: `
        SELECT s.token, u.*
        FROM sessions s
        JOIN users u ON s.user = u.id
        WHERE s.token = ?
    `,
    FIND_USER_INFO_BY_TOKEN: `
        SELECT id, name, profile_thread
        FROM sessions s
        JOIN users u ON s.user = u.id
        WHERE s.token = ?
    `,
    USERNAME_TAKEN: `
        SELECT 1
        FROM users
        WHERE name = ?
    `,
    NEW_THREAD: `
        INSERT INTO threads(creation_time)
        VALUES(CURRENT_TIMESTAMP)
    `,
    SET_USER_BIO: `
        UPDATE users
        SET bio = $bio
        WHERE id = $id
    `
}

function createSession(db: Database, user: any) {
    const token = crypto.getRandomValues(new Uint8Array(128)).toBase64();
    const tokenHash = SHA512.hash(token, "base64");
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 3);
    db.prepare(statements.NEW_SESSION).run({ $token: tokenHash, $user: user.id, $expires_on: expireDate.toISOString() });

    return { token, expireDate };
}

const server = serve({
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
                db.prepare(statements.DELETE_SESSION_BY_TOKEN).run(SHA512.hash(token, "base64"));
            }

            req.cookies.delete("token");
            return Response.redirect("/");
        },

        "/api/visit": {
            async GET() {
                using db = getDb();
                return Response.json(db.query(statements.GET_VISIT_COUNT).get());
            },
            async POST() {
                using db = getDb();
                db.run(statements.NEW_VISIT);

                return Response.json(db.query(statements.GET_VISIT_COUNT).get());
            }
        },
        "/api/thread/:threadId": {
            async GET(req) {
                using db = getDb();

                const select = db.query(statements.GET_THREAD_POSTS);
                return Response.json(select.all({ $thread: req.params.threadId, $limit: 20 }));
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
                let user: any;
                if(token != null) {
                    user = db.query(statements.FIND_USER_BY_TOKEN).get(SHA512.hash(token, "base64"));
                }

                const postResult = user == null
                    ? db.prepare(statements.NEW_ANONYMOUS_POST).run({ $content: payload.content, $thread: req.params.threadId })
                    : db.prepare(statements.NEW_USER_POST).run({ $content: payload.content, $author: user.id, $thread: req.params.threadId });

                const post = db.query(statements.GET_POST_BY_ID).get(postResult.lastInsertRowid);
                
                return Response.json(post);
            }
        },
        "/api/user/me": async req => {
            using db = getDb();

            const token = req.cookies.get("token");
            
            if(token == null) {
                return Response.json(null);
            }
            
            const user = db.query(statements.FIND_USER_INFO_BY_TOKEN).get(SHA512.hash(token, "base64"));
            return Response.json(user);
        },
        "/api/user/:id": {
            async GET(req) {
                using db = getDb();
                const user = db.query(statements.GET_USER_INFO_BY_ID).get(req.params.id);

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
                let user: any;
                if(token != null) {
                    user = db.query(statements.FIND_USER_BY_TOKEN).get(SHA512.hash(token, "base64"));
                }

                if(user?.id != req.params.id) {
                    return new Response("Forbidden", { status: 403 });
                }

                if(payload.bio != null) {
                    db.prepare(statements.SET_USER_BIO).run({ $id: req.params.id, $bio: payload.bio });
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

                if(db.query(statements.USERNAME_TAKEN).get(payload.username)) {
                    return Response.json(
                        { error: "username_taken" },
                        { status: 400 }
                    );
                }

                const hash = await password.hash(payload.password);

                const loginResult = db.query(statements.NEW_LOGIN_PASSWORD).run(hash);
                const registerResult = db.query(statements.NEW_USER).run({ $name: payload.username, $login: loginResult.lastInsertRowid,  });

                const user = db.query(statements.GET_USER_INFO_BY_ID).get(registerResult.lastInsertRowid);

                const session = createSession(db, user);
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
                const user: any = db.query(statements.FIND_USER_LOGIN).get(payload.username);
                if(user == null) {
                    return Response.json(
                        { error: "unknown_user" },
                        { status: 404 }
                    );
                }
                const login: any = db.query(statements.GET_LOGIN_BY_ID).get(user.login);

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

                const session = createSession(db, user);
                req.cookies.set("token", session.token, { expires: session.expireDate });

                return Response.json({ token: session.token });
            }
        }
    }
})

console.log(`Server running at ${server.url}`);