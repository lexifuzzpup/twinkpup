import { Database, type SQLQueryBindings } from "bun:sqlite";
import { z, type ZodType } from "zod";

function query
    <Schema extends ZodType, Params extends SQLQueryBindings = never>
    (schema: Schema, sql: string)
{
    return {
        get(db: Database, args?: Params) {
            const response = db.query(sql).get(args!);
            if(response == null) return null;

            return schema.parse(response);
        },
        all(db: Database, args?: Params) {
            const response = db.query(sql).all(args!);

            return response.map(row => schema.parse(row) as z.output<Schema>);
        }
    }
}
function operation
    <Params extends SQLQueryBindings = never>
    (sql: string)
{
    return {
        run(db: Database, args: Params) {
            return db.prepare(sql).run(args);
        }
    }
}

export const PostView = z.object({
    id: z.int(),
    time: z.string(),
    author_id: z.int().nullable(),
    author_name: z.string().nullable(),
    content: z.string()
});
export type PostView = z.infer<typeof PostView>;

export const findPostById = query
<typeof PostView, number>
(PostView, `
    SELECT p.id,
            p.time,
            p.author AS author_id,
            u.name AS author_name,
            p.content
    FROM posts p
    LEFT JOIN users u ON p.author = u.id
    WHERE p.id = ?
`);
export const findPostsInThread = query
<typeof PostView, { $thread: number, $limit: number }>
(PostView, `
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
`);

export const createPost = operation
<{ $time: string, $author: number | null, $content: string, $thread: number }>
(`
    INSERT INTO posts(time, author, content, thread)
    VALUES($time, $author, $content, $thread)
`)

export const UserView = z.object({
    id: z.int(),
    name: z.string(),
    login: z.int().nullable(),
    profile_thread: z.int().nullable(),
    creation_time: z.string(),
    bio: z.string().nullable()
});
export type UserView = z.infer<typeof UserView>;

export const findUserByToken = query
<typeof UserView, string>
(UserView, `
    SELECT u.*
    FROM sessions s
    JOIN users u ON s.user = u.id
    WHERE s.token = ?
`);
export const findUserById = query
<typeof UserView, number>
(UserView, `
    SELECT *
    FROM users
    WHERE id = ?
`);

export const setUserBio = operation
<{ $bio: string, $id: number }>
(`
    UPDATE users
    SET bio = $bio
    WHERE id = $id
`);

export const isUsernameTaken = query
<z.ZodNumber, string>
(z.number(), `
    SELECT 1
    FROM users
    WHERE name = ?
`);

export const createUser = operation
<{ $name: string, $login: number, $creation_time: string }>
(`
    INSERT INTO users(name, login, creation_time)
    VALUES($name, $login, $creation_time)
`);

export const PublicUserView = z.object({
    id: z.int(),
    name: z.string(),
    profile_thread: z.int().nullable(),
    bio: z.string().nullable()
});
export type PublicUserView = z.infer<typeof PublicUserView>;

export const findPublicUserById = query
<typeof PostView, number>
(PostView, `
    SELECT id, name, profile_thread, bio
    FROM users
    WHERE id = ?
`);

export const UserLogin = z.object({
    user_id: z.int(),
    login_id: z.int(),
    password: z.string()
});
export type UserLogin = z.infer<typeof UserLogin>;

export const findLoginByUserName = query
<typeof UserLogin, string>
(UserLogin, `
    SELECT u.id as user_id,
           l.id as login_id,
           l.password
    FROM users u
    JOIN logins l ON u.login = l.id
    WHERE u.name = ?
`);

export const createPasswordLogin = operation
<{ $hash: string, $creation_time: string }>
(`
    INSERT INTO logins(password, creation_time)
    VALUES($hash, $creation_time)
`)


export const createSession = operation
<{ $token: string, $user: number, $expires_on: string }>
(`
    INSERT INTO sessions(token, user, expires_on)
    VALUES($token, $user, $expires_on)
`);

export const deleteSession = operation
<string>
(`
    DELETE FROM sessions
    WHERE token = ?
`);

export const VisitCountView = z.object({ visits: z.number() });
export const getVisitCount = query
<typeof VisitCountView>
(VisitCountView, `
    SELECT COUNT(time) AS visits FROM visits
`)

export const createVisit = operation
<string>
(`
    INSERT INTO visits(time)
    VALUES(?)
`)