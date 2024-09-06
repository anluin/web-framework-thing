import "./main.css";

document.title = "Hello, world!";


const body = document.createElement("body");

body.appendChild(
    document.createTextNode("Hello, world!"),
);

document.body.replaceWith(body);
