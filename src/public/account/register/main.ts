const registerForm = document.querySelector("#register");
const registerFormUsername = document.querySelector("#account-username") as HTMLDivElement;
const registerFormPassword = document.querySelector("#account-password") as HTMLDivElement;
const registerFormPasswordConfirm = document.querySelector("#account-password-confirm") as HTMLDivElement;

function registerFormError(field: string, message: string) {
    let errorElement;

    if(field == "username") errorElement = registerFormUsername.querySelector(".error");
    if(field == "password") errorElement = registerFormPassword.querySelector(".error");
    if(field == "password_confirm") errorElement = registerFormPasswordConfirm.querySelector(".error");

    if(errorElement) {
        errorElement.textContent = message;
    }
}

function formatMinMax(min?: number, max?: number) {
    if(min == null && max == null) return "any number";
    if(min != null && max == null) return "at least " + min;
    if(min == null && max != null) return "fewer than " + max;
    if(min != null && max != null) return "between " + min + " and " + max;

    return "nothing";
}

registerForm?.addEventListener("submit", async event => {
    event.preventDefault();

    registerForm.querySelectorAll(".error").forEach(el => el.textContent = "");

    const username = registerFormUsername.querySelector("input")?.value;
    const password = registerFormPassword.querySelector("input")?.value;
    const passwordConfirm = registerFormPasswordConfirm.querySelector("input")?.value;

    if(password != passwordConfirm) {
        registerFormError("password_confirm", "passwords do not match =^._.^= ∫");
        return;
    }

    const payload = { username, password };

    const request = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(payload)
    });

    if(request.ok) {
        document.location.assign("/");
    } else {
        const response = await request.json().catch();

        if(response.error == "username_length") {
            registerFormError("username", `must be ${formatMinMax(response.min, response.max)} characters !!`);
        } else if(response.error == "username_taken") {
            registerFormError("username", "someone else stole this username...");
        } else if(response.error == "password_length") {
            registerFormError("password", `must be ${formatMinMax(response.min, response.max)} characters !!`);
        } else if(response.error == "invalid_username") {
            registerFormError("username", "letters, numberz, dashes, underscores, and dots only.. U・ﻌ・U");
        } else {
            registerFormError("username", "an unknown error happened (ﾐዋ ﻌ ዋﾐ)ﾉ");
        }
    }
})