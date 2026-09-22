import { serve } from "bun";
import { Database } from "bun:sqlite";
import home from "./public/home/index.html";

const developmentEnabled = process.env.NODE_ENV?.toLowerCase() == "development";

function getDb() {
    const db = new Database("/usr/db/mydb.sqlite", {
        create: true
    });
    db.run("PRAGMA foreign_keys = ON");
    return db;
}

getDb().run(`CREATE TABLE IF NOT EXISTS visits(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);
getDb().run(`CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR2(50) UNIQUE CHECK(LENGTH(name) BETWEEN 4 AND 50)
)`);
getDb().run(`CREATE TABLE IF NOT EXISTS posts(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    author INT,
    content VARCHAR2(1000),
    FOREIGN KEY(author) REFERENCES users(id)
)`);

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
                using db = getDb();
                const { content } = await req.json() as { content: string };
                const insert = db.query(`
                    INSERT INTO posts(time, author, content)
                    VALUES(CURRENT_TIMESTAMP, NULL, $content)
                `);
                insert.run({ $content: content });
                
                return Response.json({ success: true });
            }
        }
    }
})

console.log(`Server running at ${server.url}`);