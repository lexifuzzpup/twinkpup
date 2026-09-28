import z from "zod";

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