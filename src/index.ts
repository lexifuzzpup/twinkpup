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
    post_post: z.object({
        content: z.string().nonempty()
    })
};

const server = serve({
    development: developmentEnabled,
    routes: {
        "/": home,
        "/api/visit": {
            async POST() {
                using db = getDb();
                db.run("INSERT INTO visits(time) VALUES(CURRENT_TIMESTAMP)");

                return Response.json(db.query("SELECT COUNT(time) AS visits FROM visits").get());
            }
        },
        "/api/posts": {
            async GET() {
                using db = getDb();

                const select = db.query(`
                    SELECT p.id,
                           UNIXEPOCH(p.time) AS time,
                           p.author AS author_id,
                           u.name AS author_name,
                           p.content
                    FROM posts p
                    LEFT JOIN users u ON p.author = u.id
                    ORDER BY time DESC
                    LIMIT 20
                `);
                return Response.json(select.all());
            },
            async POST(req) {
                const rawData = await req.json();
                let payload: z.infer<typeof userContentSchema.post_post>;
                try {
                    payload = userContentSchema.post_post.parse(rawData);
                } catch(e) {
                    return new Response("Schema mismatch", { status: 422 })
                }
                
                using db = getDb();
                const insert = db.query(`
                    INSERT INTO posts(time, author, content)
                    VALUES(CURRENT_TIMESTAMP, NULL, $content)
                `);
                insert.run({ $content: payload.content });
                
                return Response.json({ success: true });
            }
        }
    }
})

console.log(`Server running at ${server.url}`);