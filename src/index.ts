import { serve } from "bun";
import { Database } from "bun:sqlite";
import home from "./public/home/index.html";
import { migrate } from "bun-migrate";
import z from "zod";

const developmentEnabled = process.env.NODE_ENV?.toLowerCase() == "development";

function getDb() {
    const db = new Database("/usr/db/mydb.sqlite", {
        create: true
    });
    db.run("PRAGMA foreign_keys = ON");
    return db;
}

await migrate(getDb(), {
    migrations: "src/migrations"
});

const userContentSchema = {
    NEW_POST: z.object({
        content: z.string().nonempty()
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
    NEW_POST: `
        INSERT INTO posts(time, author, content)
        VALUES(CURRENT_TIMESTAMP, NULL, $content)
    `,
    GET_POST_BY_ID: "SELECT * FROM posts WHERE id = $id"
}

const server = serve({
    development: developmentEnabled,
    routes: {
        "/": home,
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
        "/api/posts": {
            async GET() {
                using db = getDb();

                const select = db.query(statements.GET_POSTS);
                return Response.json(select.all());
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
                const insert = db.query(statements.NEW_POST);
                const result = insert.run({ $content: payload.content });
                const inserted = db.query(statements.GET_POST_BY_ID);
                
                return Response.json(inserted.get({ $id: result.lastInsertRowid }));
            }
        }
    }
})

console.log(`Server running at ${server.url}`);