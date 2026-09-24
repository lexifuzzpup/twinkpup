CREATE TRIGGER IF NOT EXISTS users_create_profile_thread
AFTER INSERT ON users
FOR EACH ROW
WHEN NEW.profile_thread IS NULL
BEGIN
    INSERT INTO threads(creation_time)
    VALUES(CURRENT_TIMESTAMP);

    UPDATE users
    SET profile_thread = last_insert_rowid()
    WHERE id = NEW.id;
END;

-- Backfill existing users that never had a profile thread assigned
CREATE TEMP TABLE profile_thread_backfill AS
    SELECT id AS user_id,
            (SELECT COALESCE(MAX(id), 0) FROM threads) + ROW_NUMBER() OVER (ORDER BY id) AS thread_id,
            creation_time
    FROM users
    WHERE profile_thread IS NULL;

INSERT INTO threads(id, creation_time)
    SELECT thread_id, creation_time FROM profile_thread_backfill;

UPDATE users
SET profile_thread = (
    SELECT thread_id
    FROM profile_thread_backfill
    WHERE user_id = users.id
)
WHERE profile_thread IS NULL;

DROP TABLE profile_thread_backfill;
