import "./main.css";

// Available inside server side rendering context
// Can be used to manipulate the response
declare const server: {
    readonly response: Response;

    // Before the DOM is serialized and sent to the client,
    // all notified promises are waited for.
    notifyPendingPromise(promise: Promise<unknown>): void;
} | undefined;

if (server) {
    document.title = "Hello, world!";

    document.body.appendChild(
        document.createTextNode("Hello, world!"),
    );
}
