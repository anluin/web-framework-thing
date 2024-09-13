import { element, restore, SKIP, text } from "@lib/frontend/shadow.ts";
import { computed, signal } from "@lib/frontend/reactivity.ts";

import "./main.css";

const App = () => {
    const $numClicks = signal(0);

    return (
        element.body([
            element.button({
                onClick() {
                    $numClicks.value += 1;
                },
            }, [
                computed(() => {
                    if ($numClicks.value > 0) {
                        return text(`Num clicks: ${$numClicks.peekValue}`);
                    }

                    return text("Click me!");
                }),
            ]),
        ])
    );
};

server?.cacheResponse(true);
restore(document.documentElement)
    .replaceWith(
        element.html({}, [
            element.head([
                element.title([
                    ...text`Hello, world!`,
                ]),
                element.link({
                    rel: "stylesheet",
                    href: server?.bundle.cssBundleFileName ?? SKIP,
                }),
                element.script({
                    type: "module",
                    src: server?.bundle.jsBundleFileName ?? SKIP,
                }),
            ]),
            App(),
        ]),
    );
