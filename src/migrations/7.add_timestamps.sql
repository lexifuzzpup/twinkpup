ALTER TABLE users
    ADD COLUMN creation_time TIMESTAMP NOT NULL default 0;
UPDATE users SET creation_time = CURRENT_TIMESTAMP;

ALTER TABLE threads
    ADD COLUMN creation_time TIMESTAMP NOT NULL default 0;
UPDATE threads SET creation_time = CURRENT_TIMESTAMP;

ALTER TABLE sessions
    ADD COLUMN creation_time TIMESTAMP NOT NULL default 0;
UPDATE sessions SET creation_time = CURRENT_TIMESTAMP;

ALTER TABLE logins
    ADD COLUMN creation_time TIMESTAMP NOT NULL default 0;
UPDATE logins SET creation_time = CURRENT_TIMESTAMP;