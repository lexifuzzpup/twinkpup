import type { PublicUserView } from "../statements";

export function PostingAsBanner({ user }: { user: PublicUserView | null }) {
    return (
        <div className="account-notice" style={{ color: "#f0f" }}>
            { user == null
                ? <>
                    you are posting as the elusive <span className="aware">ANONYMOUS</span>..
                    {" "}
                    <a href="/account/login">log in</a> or <a href="/account/register">create account</a>
                </>
                : <>
                    you are logged in as <a href={"/profile/" + user.id} className="aware" target="_blank">{user.name}</a> !!
                    (or <a href="/account/logout">log out</a>)
                </>
            }
        </div>
    );
}