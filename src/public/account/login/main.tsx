import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Field } from "../field.tsx";

createRoot(document.querySelector("#root")!).render(<Login />);

function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    return (
        <>
            <div className="background"></div>

            <a href="/" className="super-aware">return home</a>

            <fieldset style={{ width: "24rem" }}>
                <legend className="super-aware">log into existing account</legend>
                <a href="/account/register">make a new one instead?</a>
                <form onSubmit={async event => {
                    event.preventDefault();

                    setErrors({});

                    const payload = { username, password };

                    const request = await fetch("/api/login", {
                        method: "POST",
                        body: JSON.stringify(payload)
                    });

                    if(request.ok) {
                        document.location.assign("/");
                    } else {
                        const response = await request.json().catch(() => ({}));

                        if(response.error == "unknown_user") {
                            setErrors({ username: "this username does not exist !!" });
                        } else if(response.error == "invalid_password") {
                            setErrors({ password: "this password is wrong..." });
                        } else {
                            setErrors({ username: "an unknown error happened (ﾐዋ ﻌ ዋﾐ)ﾉ" });
                        }
                    }
                }}>
                    <Field id="account-username" label="Username" error={errors.username}
                        type="text" name="username" autoComplete="username"
                        value={username} onChange={event => setUsername(event.target.value)} />
                    <Field id="account-password" label="Password" error={errors.password}
                        type="password" name="password" autoComplete="current-password"
                        value={password} onChange={event => setPassword(event.target.value)} />

                    <input type="submit" value="log in!" />
                </form>
            </fieldset>
        </>
    );
}
