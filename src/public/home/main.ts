const visitCounter = document.querySelector("#visit-count") as HTMLSpanElement;
const newPostForm = document.querySelector("#new-post") as HTMLFormElement;
const recentPosts = document.querySelector("#recent-posts") as HTMLDivElement;
const accountNotice = document.querySelector("#account-notice") as HTMLDivElement;

main();

interface PostCard {
    id: number;
    author_id: number;
    author_name: string;
    time: number;
    content: string;
}

async function main() {
    await fetch("/api/visit", { method: "POST" });
    
    await loadVisitCounter();
    await loadRecentPosts();
    await loadAccountNotice();

    if(newPostForm) {
        newPostForm.addEventListener("submit", async event => {
            event.preventDefault();
            const contentBox = newPostForm.getElementsByTagName("textarea").item(0);
            if(!contentBox) return;

            const content = contentBox.value;
            contentBox.value = "";

            const request = await fetch("/api/posts", { method: "POST", body: JSON.stringify({ content }) });
            if(request.ok) {
                await loadRecentPosts();
            }
        })
    }

    setInterval(() => {
        loadVisitCounter();
        loadRecentPosts();
    }, 10 * 1000);
}

function createPostCard(post: PostCard) {
    const container = document.createElement("fieldset");
    container.classList.add("post");

    const author = document.createElement("legend");
    if(post.author_name == null) {
        author.textContent = "Anonymous";
        author.style.fontStyle = "oblique";
    } else {
        author.textContent = post.author_name;
    }
    author.classList.add("author");

    const timestamp = document.createElement("span");
    timestamp.textContent = new Date(post.time * 1000).toLocaleDateString(navigator.language, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
    timestamp.classList.add("timestamp");

    const content = document.createElement("code");
    content.textContent = post.content;

    container.append(author, timestamp, content);
    return container;
}

async function loadAccountNotice() {
    if(!accountNotice) return;

    const request = await fetch("/api/user/me");
    if(request.ok) {
        const me = await request.json();
        
        const label = document.createElement("span");
        const accountManagementPrompt = document.createElement("span");
        label.style.fontSize = "1.5em";

        if(me == null) {
            label.textContent = "ANONYMOUS";
            
            const loginButton = document.createElement("a");
            loginButton.textContent = "log in";
            loginButton.href = "/account/login";

            const registerButton = document.createElement("a");
            registerButton.textContent = "create account";
            registerButton.href = "/account/register";
            
            accountManagementPrompt.replaceChildren(
                loginButton,
                document.createTextNode(" or "),
                registerButton
            );

            accountNotice.replaceChildren(
                document.createTextNode("you are posting as the elusive "),
                label,
                document.createTextNode(".. "),
                accountManagementPrompt
            );
        } else {
            label.textContent = me.name;
            
            const logoutButton = document.createElement("a");
            logoutButton.textContent = "log out";
            logoutButton.href = "/account/logout";
            accountManagementPrompt.replaceChildren(
                document.createTextNode(" (or "),
                logoutButton,
                document.createTextNode(")")
            );

            accountNotice.replaceChildren(
                document.createTextNode("you are logged in as "),
                label,
                document.createTextNode(" !!"),
                accountManagementPrompt
            );
        }
    } else {
        console.error("Failed to load account notice");
    }
}

async function loadRecentPosts() {
    if(!recentPosts) return;

    const request = await fetch("/api/posts");
    if(request.ok) {
        const posts = await request.json();
        
        recentPosts.replaceChildren();
        for(const post of posts) {
            const card = createPostCard(post);

            recentPosts.append(card);
        }
    } else {
        console.error("Failed to load recent posts");
    }
}

async function loadVisitCounter() {
    if(!visitCounter) return;

    const request = await fetch("/api/visit");
    if(request.ok) {
        const response = await request.json();

        visitCounter.textContent = `${response.visits}`;
    } else {
        console.error("Failed to load visit counter");
    }
}