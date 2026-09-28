import { SHA512 } from "bun";
import { Database } from "bun:sqlite";
import { z } from "zod";

export const PostView = z.object({
    id: z.int(),
    time: z.coerce.date(),
    author_id: z.int().nullable(),
    author_name: z.string().nullable(),
    content: z.string()
});
export type PostView = z.infer<typeof PostView>;

export const UserView = z.object({
    id: z.int(),
    name: z.string(),
    login: z.int().nullable(),
    profile_thread: z.int().nullable(),
    creation_time: z.coerce.date(),
    bio: z.string().nullable()
});
export type UserView = z.infer<typeof UserView>;

export const PublicUserView = z.object({
    id: z.int(),
    name: z.string(),
    profile_thread: z.int().nullable(),
    bio: z.string().nullable()
});
export type PublicUserView = z.infer<typeof PublicUserView>;

export const UserLogin = z.object({
    user_id: z.int(),
    login_id: z.int(),
    password: z.string()
});
export type UserLogin = z.infer<typeof UserLogin>;

export class Repository {
    public constructor(
        public readonly db: Database
    ) {
        db.run("PRAGMA foreign_keys = ON");
    }

    public getVisitCount(): number {
        const response: any = this.db.query(`
            SELECT COUNT(time) AS visits FROM visits
        `).get()

        return response?.visits ?? 0;
    }

    public createVisit(): number {
        const response = this.db.prepare(`
            INSERT INTO visits(time)
            VALUES(?)
        `).run(new Date().toISOString());

        return response.lastInsertRowid as number;
    }
    
    public getPost(id: number): PostView | null {
        const response = this.db.query(`
            SELECT p.id,
                    p.time,
                    p.author AS author_id,
                    u.name AS author_name,
                    p.content
            FROM posts p
            LEFT JOIN users u ON p.author = u.id
            WHERE p.id = ?
        `).get(id);
        
        if(response == null) return null;
        return PostView.parse(response);
    }
    
    public findPostsInThread(thread: number, limit: number): PostView[] {
        const response = this.db.query(`
            SELECT p.id,
                    p.time,
                    p.author AS author_id,
                    u.name AS author_name,
                    p.content
            FROM posts p
            LEFT JOIN users u ON p.author = u.id
            WHERE p.thread = $thread
            ORDER BY time DESC
            LIMIT $limit
        `).all({ $thread: thread, $limit: limit });

        return PostView.array().parse(response);
    }
    
    public createPost(author: number | null, content: string, thread: number): number {
        const response = this.db.prepare(`
            INSERT INTO posts(time, author, content, thread)
            VALUES($time, $author, $content, $thread)
        `).run({ 
            $author: author, $content: content, $thread: thread,
            $time: new Date().toISOString()
        });

        return response.lastInsertRowid as number;
    }
    
    public findUserByToken(token: string): UserView | null {
        const response = this.db.query(`
            SELECT u.*
            FROM sessions s
            JOIN users u ON s.user = u.id
            WHERE s.token = ?
        `).get(SHA512.hash(token, "base64"));

        if(response == null) return null;
        return UserView.parse(response);
    }
    
    public getUser(id: number): UserView | null {
        const response = this.db.query(`
            SELECT *
            FROM users
            WHERE id = ?
        `).get(id);
        
        if(response == null) return null;
        return UserView.parse(response);
    }
    
    public getPublicUser(id: number): PublicUserView | null {
        const response = this.db.query(`
            SELECT id,
                   name,
                   profile_thread,
                   bio
            FROM users
            WHERE id = ?
        `).get(id);
        
        if(response == null) return null;
        return PublicUserView.parse(response);
    }
    
    public setUserBio(id: number, bio: string): number {
        const response = this.db.prepare(`
            UPDATE users
            SET bio = $bio
            WHERE id = $id
        `).run({ $id: id, $bio: bio });

        return response.changes;
    }
    
    public isUsernameTaken(username: string): boolean {
        const response: any = this.db.query(`
            SELECT 1 as taken
            FROM users
            WHERE name = ?
        `).get(username);

        if(response?.taken) return true;
        return false;
    }
    
    public createUser(name: string, login: number): number {
        const response = this.db.prepare(`
            INSERT INTO users(name, login, creation_time)
            VALUES($name, $login, $creation_time)
        `).run({
            $name: name, $login: login,
            $creation_time: new Date().toISOString()
        });

        return response.lastInsertRowid as number;
    }

    public findLoginByUserName(name: string): UserLogin | null {
        const response = this.db.query(`
            SELECT u.id as user_id,
                   l.id as login_id,
                   l.password
            FROM users u
            JOIN logins l ON u.login = l.id
            WHERE u.name = ?
        `).get(name);

        if(response == null) return null;

        return UserLogin.parse(response);
    }

    public createPasswordLogin(passwordHash: string): number {
        const response = this.db.prepare(`
            INSERT INTO logins(password, creation_time)
            VALUES($hash, $creation_time)
        `).run({
            $password: passwordHash,
            $creation_time: new Date().toISOString()
        });

        return response.lastInsertRowid as number;
    }

    public createSession(user: number, expiresOn: Date): string | null {
        const token = crypto.getRandomValues(new Uint8Array(128)).toBase64();
    
        const response = this.db.prepare(`
            INSERT INTO sessions(token, user, expires_on)
            VALUES($token, $user, $expires_on)
        `).run({
            $token: SHA512.hash(token, "base64"), $user: user,
            $expires_on: expiresOn.toISOString()
        });
        
        if(response.changes == 0) return null;

        return token;
    }

    public deleteSession(token: string): number {
        const response = this.db.prepare(`
            DELETE FROM sessions
            WHERE token = ?
        `).run(SHA512.hash(token, "base64"));

        return response.changes;
    }
}