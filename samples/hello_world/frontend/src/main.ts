import "./main.css";

// Available inside server side rendering context
// Can be used to manipulate the response
declare const server: {
    readonly response: Response;

    readonly bundle: {
        jsBundleFileName: string;
        cssBundleFileName?: string;
    };

    // Before the DOM is serialized and sent to the client,
    // all notified promises are waited for.
    notifyPendingPromise(promise: Promise<unknown>): void;
} | undefined;

if (server) {
    const script = document.createElement("script");
    script.src = server.bundle.jsBundleFileName;
    script.type = "module";
    document.head.appendChild(script);

    if (server.bundle.cssBundleFileName) {
        const link = document.createElement("link");
        link.href = server.bundle.cssBundleFileName;
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }

    document.title = "Hello, world!";

    document.body.appendChild(
        document.createTextNode("Hello, world!"),
    );
}
