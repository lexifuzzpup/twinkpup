import { password as bunPassword } from "bun";
import Elysia from "elysia";
import z from "zod";
import auth from "../auth";
import { PublicUserView, Repository } from "../database";

const future = {
    inDays(days: number) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
    }
}

export default (repo: Repository) => new Elysia()
    .use(auth(repo))
    .get("/visit", () => {
        return { visits: repo.getVisitCount() }
    })
    .post("/visit", ({ status }) => {
        repo.createVisit();
        return status(201, { visits: repo.getVisitCount() });
    })

    .group("/thread/:threadId", {
        params: z.object({
            threadId: z.coerce.number().int()
        })
    }, app => app
        .get("", async ({ params: { threadId } }) => {
            return repo.findPostsInThread(threadId, 20);
        }, )
        .post("", async ({ body, params: { threadId }, user, status }) => {
            const postId = repo.createPost(user?.id ?? null, body.content, threadId);

            const post = repo.getPost(postId);
            
            if(post == null) return Response.json(null, { status: 404 });
            return status(201, post);
        }, {
            body: z.object({
                content: z.string().trim().nonempty().max(1000)
            }),
            optionalAuth: true
        })
    )

    .get("/user/me", async ({ user }) => {
        if(user == null) return Response.json(null, { status: 401 });
        return PublicUserView.parse(user);
    }, {
        optionalAuth: true
    })
    
    .group("/user/:userId", {
        params: z.object({
            userId: z.coerce.number().int()
        })
    }, app => app
        .get("", async ({ params: { userId } }) => {
            const user = repo.getUser(userId);

            if(user == null) return Response.json(null, { status: 404 });
            return PublicUserView.parse(user);
        })
        .patch("", async ({ params: { userId }, status, body, user }) => {
            if(user.id != userId) {
                return status(403, { error: "forbidden" });
            }

            if(body.bio != null) {
                repo.setUserBio(userId, body.bio);
            }

            return status(205, { success: true });
        }, {
            body: z.object({
                // username: z.string().optional(),
                bio: z.string().max(4000).optional(),
            }),
            requiredAuth: true
        })
    )

    .post("/register", async ({ body: { username, password }, status, cookie }) => {
        if(username.length < 4 || username.length > 50) {
            return status(400, { error: "username_length", min: 4, max: 50 });
        }
        if(password.length < 6) {
            return status(400, { error: "password_length", min: 6 });
        }

        if(/[^A-Za-z0-9\-_\.]/g.test(username)) {
            return status(400, { error: "invalid_username" });
        }
        
        if(repo.isUsernameTaken(username)) {
            return status(400, { error: "username_taken" });
        }

        const hash = await bunPassword.hash(password);

        const loginId = repo.createPasswordLogin(hash);
        const userId = repo.createUser(username, loginId);

        const tokenExpires = future.inDays(3);
        const token = repo.createSession(userId, tokenExpires);

        if(token != null) {
            const tokenCookie = cookie.token;
            tokenCookie.value = token;
            tokenCookie.expires = tokenExpires;
            tokenCookie.secure = true;
        }

        const user = repo.getPublicUser(userId);

        return status(201, user);
    }, {
        body: z.object({
            username: z.string().nonempty(),
            password: z.string().nonempty()
        }),
        optionalAuth: true // adds the "token" cookie
    })
    
    .post("/login", async ({ body: { username, password }, status, cookie }) => {
        const login = repo.findLoginByUserName(username);
        if(login == null) {
            return status(404, { error: "unknown_user" });
        }

        if(login.password != null) {
            const success = await bunPassword.verify(password, login.password);

            if(!success) return status(401, { error: "invalid_password" });
        } else {
            return status(400, { error: "unknown_auth_type" });
        }

        const tokenExpires = future.inDays(3);
        const token = repo.createSession(login.user_id, tokenExpires);

        if(token != null) {
            const tokenCookie = cookie.token;
            tokenCookie.value = token;
            tokenCookie.expires = tokenExpires;
            tokenCookie.secure = true;

            return { token };
        }

        return status(500, { error: "token_creation_failure" });
    }, {
        body: z.object({
            username: z.string().nonempty(),
            password: z.string().nonempty()
        }),
        optionalAuth: true // adds the "token" cookie
    })

    .post("/logout", async ({ cookie: { token }, status }) => {
        if(repo.deleteSession(token.value)) {
            token.remove();

            return status(205, { success: true });
        }

        return status(200, { warning: "token_not_found" });
    }, {
        requiredAuth: true
    })