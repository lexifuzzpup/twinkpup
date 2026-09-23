PRAGMA foreign_keys = OFF;

ALTER TABLE visits
    ALTER time SET NOT NULL;

ALTER TABLE users
    ALTER name SET NOT NULL;

ALTER TABLE posts
    ALTER time SET NOT NULL;

ALTER TABLE posts
    ALTER author SET NOT NULL;

ALTER TABLE posts
    ALTER content SET NOT NULL;

PRAGMA foreign_keys = ON;