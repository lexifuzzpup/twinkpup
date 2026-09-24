import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Field } from "../field.tsx";

createRoot(document.querySelector("#root")!).render(<Register />);

function formatMinMax(min?: number, max?: number) {
    if(min == null && max == null) return "any number";
    if(min != null && max == null) return "at least " + min;
    if(min == null && max != null) return "fewer than " + max;
    if(min != null && max != null) return "between " + min + " and " + max;

    return "nothing";
}

function Register() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <>
            <div className="background"></div>

            <a href="/" className="super-aware">return home</a>

            <fieldset style={{ width: "24rem" }}>
                <legend className="super-aware">new account</legend>
                <a href="/account/login">log into an existing one instead?</a>
                <form onSubmit={async event => {
                    event.preventDefault();

                    setErrors({});

                    if(password != passwordConfirm) {
                        setErrors({ password_confirm: "passwords do not match =^._.^= ∫" });
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
                        const response = await request.json().catch(() => ({}));

                        if(response.error == "username_length") {
                            setErrors({ username: `must be ${formatMinMax(response.min, response.max)} characters !!` });
                        } else if(response.error == "username_taken") {
                            setErrors({ username: "someone else stole this username..." });
                        } else if(response.error == "password_length") {
                            setErrors({ password: `must be ${formatMinMax(response.min, response.max)} characters !!` });
                        } else if(response.error == "invalid_username") {
                            setErrors({ username: "letters, numberz, dashes, underscores, and dots only.. U・ﻌ・U" });
                        } else {
                            setErrors({ username: "an unknown error happened (ﾐዋ ﻌ ዋﾐ)ﾉ" });
                        }
                    }
                }}>
                    <Field id="account-username" label="Username" error={errors.username}
                        type="text" name="username" autoComplete="username"
                        value={username} onChange={event => setUsername(event.target.value)} />
                    <Field id="account-password" label="Password" error={errors.password}
                        type="password" name="password" autoComplete="new-password"
                        value={password} onChange={event => setPassword(event.target.value)} />
                    <Field id="account-password-confirm" label="Confirm Password" error={errors.password_confirm}
                        type="password" name="password-confirm" autoComplete="new-password"
                        value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} />

                    <input type="submit" value="register!" />
                </form>
            </fieldset>
        </>
    );
}
