
import Elysia from "elysia";
import api from "./api/route";
import auth from "./auth";
import account_login from "./public/account/login/index.html";
import account_register from "./public/account/register/index.html";
import hole_index from "./public/hole/index.html";
import home_index from "./public/home/index.html";
import profile_index from "./public/profile/index.html";
import thehole from "./thehole/route";

const developmentEnabled = process.env.NODE_ENV?.toLowerCase() == "development";

const app = new Elysia()
    .use(auth)
    .use(thehole)
    .group("/api", app => app.use(api))
    
    .get("/", home_index)
    .group("/account", app => app
        .get("/register", account_register)
        .get("/login", account_login)
    )
    .get("/profile/:userId", profile_index)
    .get("/thehole", hole_index)

    .listen(3000)

async function shutdown(signal: string) {
    console.log("Received " + signal + "; stopping server...");
    await app.stop();
    process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));