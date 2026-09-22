const visitCounter = document.querySelector("#visit-count") as HTMLSpanElement;
const newPostForm = document.querySelector("#new-post") as HTMLFormElement;
const recentPosts = document.querySelector("#recent-posts") as HTMLDivElement;

main();

interface PostCard {
    id: number;
    author: string;
    time: number;
    content: string;
}

async function main() {
    try {
        await loadVisitCounter()
    } catch(e) {
        console.error("Failed to load visit counter:", e);
    }
    try {
        await loadRecentPosts()
    } catch(e) {
        console.error("Failed to load recent posts:", e);
    }

    if(newPostForm) {
        newPostForm.addEventListener("submit", async event => {
            event.preventDefault();
            const formData = new FormData(newPostForm);

            const content = formData.get("content") as string;

            await fetch("/api/posts", { method: "POST", body: JSON.stringify({ content }) });
            document.location.reload();
        })
    }
}

function createPostCard(post: PostCard) {
    const container = document.createElement("div");
    container.classList.add("post");

    const author = document.createElement("span");
    if(post.author == null) {
        author.textContent = "Anonymous";
        author.style.fontStyle = "oblique";
    } else {
        author.textContent = post.author;
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

async function loadRecentPosts() {
    if(!recentPosts) return;

    const request = await fetch("/api/posts");
    if(request.ok) {
        const posts = await request.json();

        for(const post of posts) {
            const card = createPostCard(post);

            recentPosts.append(card);
        }
    }
}

async function loadVisitCounter() {
    if(!visitCounter) return;

    const request = await fetch("/api/visit", { method: "POST" });
    if(request.ok) {
        const response = await request.json();

        visitCounter.textContent = `${response.visits}`;
    }
}