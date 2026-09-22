import { serve } from "bun";
import { Database } from "bun:sqlite";
import home from "./public/home/index.html";

const developmentEnabled = process.env.NODE_ENV?.toLowerCase() == "development";

function getDb() {
    return new Database("/usr/db/mydb.sqlite", { create: true });
}

getDb().run(`CREATE TABLE IF NOT EXISTS visits(
    id INT AUTO_INCREMENT PRIMARY KEY,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);
getDb().run(`CREATE TABLE IF NOT EXISTS users(
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR2(50) UNIQUE CHECK(LENGTH(name) BETWEEN 4 AND 50)
)`);
getDb().run(`CREATE TABLE IF NOT EXISTS posts(
    id INT AUTO_INCREMENT PRIMARY KEY,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    author INT REFERENCES users(id),
    content VARCHAR2(1000)
)`);

const server = serve({
    development: developmentEnabled,
    routes: {
        "/": home,
        "/api/visit": {
            async POST() {
                const db = getDb();
                db.run("INSERT INTO visits(time) VALUES(CURRENT_TIMESTAMP)");

                return Response.json(db.query("SELECT COUNT(time) AS visits FROM visits").get());
            }
        },
        "/api/posts": {
            async GET() {
                const db = getDb();

                const select = db.query(`
                    SELECT id, UNIXEPOCH(time) AS time, author, content
                    FROM posts
                    ORDER BY time DESC
                    LIMIT 20
                `);
                return Response.json(select.all());
            },
            async POST(req) {
                const db = getDb();
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