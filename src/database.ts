import { migrate, migrations } from "bun-migrate";
import { Database } from "bun:sqlite";
import path from "path";
import { mkdirSync } from "fs";

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

db.run("PRAGMA foreign_keys = ON");

export default db;