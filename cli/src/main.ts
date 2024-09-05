import { parseArgs } from "@std/cli/parse-args";
import { join } from "@std/path";

import { default as vm } from "vm";
import * as esbuild from "esbuild";
import * as jsdom from "jsdom";

async function serve() {
    const projectRootDirectoryPath = Deno.cwd();
    const frontendDirectoryPath = join(projectRootDirectoryPath, "frontend");
    const frontendSourceDirectoryPath = join(frontendDirectoryPath, "src");
    const frontendEntryPointFilePath = join(
        frontendSourceDirectoryPath,
        "main.ts",
    );

    const buildResult = await esbuild.build({
        write: false,
        platform: "browser",
        format: "esm",
        bundle: true,
        outdir: "/",
        entryNames: "index",
        absWorkingDir: projectRootDirectoryPath,
        entryPoints: [
            frontendEntryPointFilePath,
        ],
    });

    const indexJsOutputFile = buildResult.outputFiles.find((outputFile) =>
        outputFile.path === "/index.js"
    );

    const indexJsSource = `(async () => {${indexJsOutputFile!.text}})()`;

    const script = new vm.Script(indexJsSource, {
        filename: "/index.js",
    });

    await (
        Deno.serve(async (request) => {
            if (request.headers.get("accept")?.includes("text/html")) {
                const dom = new jsdom.JSDOM(`<!DOCTYPE html>`, {
                    runScripts: "outside-only",
                });

                await script.runInContext(dom.getInternalVMContext());

                return new Response(dom.serialize(), {
                    status: 200,
                    headers: {
                        "Content-Type": "text/html; charset=utf-8",
                    },
                });
            }

            return new Response(undefined, {
                status: 404,
            });
        })
            .finished
    );
}

async function main(args: string[]) {
    const { _: commands } = parseArgs(args, {});
    const command = commands.shift();

    switch (command) {
        case "serve":
            return await serve();

        default:
            throw new Error(`unknown command: ${command}`);
    }
}

if (import.meta.main) {
    await main(Deno.args);
}
