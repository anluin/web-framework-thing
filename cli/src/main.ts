import { basename, extname, join } from "@std/path";
import { parseArgs } from "@std/cli/parse-args";
import { contentType } from "@std/media-types";

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

    const sharedBuildOptions = {
        write: false,
        platform: "browser",
        format: "esm",
        bundle: true,
        outdir: "/",
        entryNames: "[hash]",
        assetNames: "[hash]",
        chunkNames: "[hash]",
        minify: true,
        absWorkingDir: projectRootDirectoryPath,
        entryPoints: [
            frontendEntryPointFilePath,
        ],
        metafile: true,
    } satisfies esbuild.BuildOptions;

    const [
        serverSideBuildResult,
        clientSideBuildResult,
    ] = await Promise.all([
        esbuild.build({
            ...sharedBuildOptions,
            entryNames: "index",
        }),
        esbuild.build({
            ...sharedBuildOptions,
            define: {
                server: `undefined`,
            },
        }),
    ]);

    let jsBundleOutputFileName: string | undefined;
    let cssBundleOutputFileName: string | undefined;

    for (const outputKey in clientSideBuildResult.metafile.outputs) {
        const output = clientSideBuildResult.metafile.outputs[outputKey];

        if (output.entryPoint) {
            jsBundleOutputFileName = `/${basename(outputKey)}`;

            if (output.cssBundle) {
                cssBundleOutputFileName = `/${basename(output.cssBundle)}`;
            }

            break;
        }
    }

    if (!jsBundleOutputFileName) {
        throw new Error("failed to find js bundle file name!");
    }

    const indexJsOutputFile = serverSideBuildResult.outputFiles.find((
        outputFile,
    ) => outputFile.path === "/index.js");

    const indexJsSource = `async (server) => {${indexJsOutputFile!.text}}`;

    const script = new vm.Script(indexJsSource, {
        filename: "/index.js",
    });

    await Deno.serve(async (request) => {
        const url = new URL(request.url);

        const outputFile = clientSideBuildResult.outputFiles.find((
            outputFile,
        ) => outputFile.path === url.pathname);

        if (outputFile) {
            return new Response(outputFile.contents, {
                status: 200,
                headers: {
                    "Content-Type": (
                        contentType(extname(outputFile.path)) ??
                            "application/octet-stream"
                    ),
                    "Cache-Control": "public, max-age=315360000",
                },
            });
        }

        if (request.headers.get("accept")?.includes("text/html")) {
            const dom = new jsdom.JSDOM(`<!DOCTYPE html>`, {
                runScripts: "outside-only",
                url: request.url,
            });

            try {
                const response = new Response(undefined, {
                    status: 200,
                    headers: {
                        "Content-Type": "text/html; charset=utf-8",
                    },
                });

                const pendingPromises: Promise<unknown>[] = [];

                await script.runInContext(dom.getInternalVMContext())({
                    response,
                    bundle: {
                        jsBundleFileName: jsBundleOutputFileName,
                        cssBundleFileName: cssBundleOutputFileName,
                    },
                    notifyPendingPromise(promise: Promise<unknown>) {
                        pendingPromises.push(promise);
                    },
                });

                while (pendingPromises.length > 0) {
                    await Promise.all(pendingPromises.splice(0));
                }

                return new Response(dom.serialize(), response);
            } finally {
                dom.window.close();
            }
        }

        return new Response(undefined, {
            status: 404,
        });
    })
        .finished;
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
