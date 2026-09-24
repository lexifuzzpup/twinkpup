const loginForm = document.querySelector("#login");
const loginFormUsername = document.querySelector("#account-username") as HTMLDivElement;
const loginFormPassword = document.querySelector("#account-password") as HTMLDivElement;

function loginFormError(field: string, message: string) {
    let errorElement;

    if(field == "username") errorElement = loginFormUsername.querySelector(".error");
    if(field == "password") errorElement = loginFormPassword.querySelector(".error");

    if(errorElement) {
        errorElement.textContent = message;
    }
}

loginForm?.addEventListener("submit", async event => {
    event.preventDefault();

    loginForm.querySelectorAll(".error").forEach(el => el.textContent = "");

    const username = loginFormUsername.querySelector("input")?.value;
    const password = loginFormPassword.querySelector("input")?.value;

    const payload = { username, password };

    const request = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify(payload)
    });

    if(request.ok) {
        document.location.assign("/");
    } else {
        const response = await request.json().catch();

        if(response?.error) {
            loginFormError(response.error.field, response.error.message);
            return;
        } else {
            loginFormError("username", "an unknown error happened (ﾐዋ ﻌ ዋﾐ)ﾉ");
        }
    }
})