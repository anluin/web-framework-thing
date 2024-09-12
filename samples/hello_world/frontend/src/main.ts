import "@lib/frontend/global.ts"

import "./main.css";

if (server) {
    server.cacheResponse = true;

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
