import { serve } from "bun";
import { Database } from "bun:sqlite";
import home from "./public/home/index.html";

function getDb() {
    return new Database("/usr/db/mydb.sqlite", { create: true });
}

getDb().run(`CREATE TABLE IF NOT EXISTS visits(
    id INT AUTO_INCREMENT PRIMARY KEY,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

const server = serve({
    routes: {
        "/": home,
        "/api/visit": {
            async POST() {
                const db = getDb();
                db.run("INSERT INTO visits(time) VALUES(CURRENT_TIMESTAMP)");

                return Response.json(db.query("SELECT COUNT(time) AS visits FROM visits").get(1));
            }
        }
    }
})

console.log(`Server running at ${server.url}`);