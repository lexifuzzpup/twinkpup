
import { migrate, migrations } from "bun-migrate";
import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import path from "path";
import app from "./app";
import { Repository } from "./database";

const developmentEnabled = process.env.NODE_ENV?.toLowerCase() == "development";
const dbLocation = process.env.SQLITE_DB_FILE ?? "/data/db.sqlite";

mkdirSync(path.dirname(dbLocation), { recursive: true });
const db = new Database(dbLocation, {
    create: true
});

db.run("PRAGMA foreign_keys = OFF");
await migrate(db, {
    migrations: (await migrations("src/migrations")).sort((a, b) => a.id - b.id),
    log: true
});

const repository = new Repository(db);
const server = app({ repository, development: developmentEnabled }).listen(3000);
const maintenanceInterval = setInterval(maintenance, 10 * 60 * 1000);
maintenance();

function maintenance() {
    console.log("Running maintenance...")

    const sessionsRemoved = repository.deleteExpiredSessions();
    if(sessionsRemoved > 0) console.log("Removed " + sessionsRemoved + " session(s)");
}

async function shutdown(signal: string) {
    console.log("Received " + signal + "; stopping server...");

    clearInterval(maintenanceInterval);
    await server.stop();
    
    process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));