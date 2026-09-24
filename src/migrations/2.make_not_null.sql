PRAGMA foreign_keys = OFF;

CREATE TABLE visits_new(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO visits_new(id, time)
    SELECT id, time FROM visits;
DROP TABLE visits;
ALTER TABLE visits_new RENAME TO visits;

CREATE TABLE users_new(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR2(50) NOT NULL UNIQUE CHECK(LENGTH(name) BETWEEN 4 AND 50)
);
INSERT INTO users_new(id, name)
    SELECT id, name FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

CREATE TABLE posts_new(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    author INT REFERENCES users(id),
    content VARCHAR2(1000) NOT NULL
);
INSERT INTO posts_new(id, time, author, content)
    SELECT id, time, author, content FROM posts;
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;

PRAGMA foreign_key_check;

PRAGMA foreign_keys = ON;
