class Thread {
    public readonly postsRoot: HTMLUListElement;
    public readonly createPostRoot: HTMLFormElement;
    public readonly createPostTextBox: HTMLTextAreaElement;

    constructor() {
        this.postsRoot = document.createElement("ul");
        this.postsRoot.classList.add("post-list");

        this.createPostRoot = document.createElement("form");
        this.createPostRoot.classList.add("new-post");

        this.createPostTextBox = document.createElement("textarea");
        this.createPostTextBox.required = true;
        this.createPostTextBox.maxLength = 1000;
        this.createPostTextBox.autocomplete = "off";
        this.createPostTextBox.placeholder = "write your smutty confessions here";

        this.createPostRoot.append(this.createPostTextBox);
    }
}