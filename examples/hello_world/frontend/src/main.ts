import "./main.css";

const link = document.createElement("link");
link.rel = "stylesheet";
link.href = "/index.css";
document.head.appendChild(link);

document.title = "Hello, world!";

document.body.appendChild(
    document.createTextNode("Hello, world!"),
);
