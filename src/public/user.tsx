export interface UserDetails {
    id: number;
    name: string;
    profile_thread: number;
}

export function PostingAsBanner({ user }: { user: UserDetails | null }) {
    return (
        <div className="account-notice" style={{ color: "#f0f" }}>
            { user == null
                ? <>
                    you are posting as the elusive <span className="aware">ANONYMOUS</span>..
                    {" "}
                    <a href="/account/login">log in</a> or <a href="/account/register">create account</a>
                </>
                : <>
                    you are logged in as <span className="aware">{user.name}</span> !!
                    (or <a href="/account/logout">log out</a>)
                </>
            }
        </div>
    );
}