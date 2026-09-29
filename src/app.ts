import { fromTypes, openapi, } from "@elysia/openapi";
import Elysia from "elysia";
import api from "./api/route";
import type { Repository } from "./database";
import account_login from "./public/account/login/index.html";
import account_register from "./public/account/register/index.html";
import hole_index from "./public/hole/index.html";
import home_index from "./public/home/index.html";
import profile_index from "./public/profile/index.html";
import settings_index from "./public/settings/index.html";
import thehole from "./thehole/route";

export default (options: { repository: Repository, development: boolean }) => new Elysia()
    .group("/thehole", app => app
        .use(thehole(options.repository))
    )
    .group("/api", app => app
        .use(openapi({
            enabled: options.development,
            references: fromTypes()
        }))
        .use(api(options.repository))
    )
    
    .get("/", home_index)
    .group("/account", app => app
        .get("/register", account_register)
        .get("/login", account_login)
    )
    .get("/profile/:userId", profile_index)
    .get("/thehole", hole_index)
    .get("/settings", settings_index)