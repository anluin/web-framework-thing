# Hello World Example

Here's a quick "Hello World" example demonstrating a simple web page.

## Project Structure

```
.
├── deno.json
├── frontend
│   ├── deno.json
│   ├── readme.md
│   └── src
│       └── main.ts
└── readme.md

2 directories, 5 files
```

## Setup

First, ensure you have [Deno](https://deno.land/) installed.

## Usage

Start the server by running:

```sh
deno task serve
```

## How It Works

The server listens on port 8000. It responds to HTTP requests with an "Accept" header containing "text/html" by
returning the rendered DOM from `frontend/src/main.ts`.

```ts
// frontend/src/main.ts
document.title = "Hello, world!";

document.body.appendChild(
    document.createTextNode("Hello, world!"),
);
```

This script sets the document title to "Hello, world!" and appends a corresponding text node to the document body.

## Example Request

Execute the following to see the server's response:

```sh
curl -H "Accept: text/html" http://localhost:8000
```

You should receive this HTML response:

```html
<!DOCTYPE html>
<html>
    <head>
        <title>Hello, world!</title>
    </head>
    <body>Hello, world!</body>
</html>
```
