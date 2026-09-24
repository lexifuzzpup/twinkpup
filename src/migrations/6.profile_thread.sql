ALTER TABLE users
    ADD COLUMN profile_thread INT REFERENCES threads(id);