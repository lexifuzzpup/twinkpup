const visitCounter = document.querySelector("#visit-count");

main();

async function main() {
    if(!visitCounter) return;

    const request = await fetch("/api/visit", { method: "POST" });
    if(request.ok) {
        const response = await request.json();

        visitCounter.textContent = `${response.visits}`;
    }
}