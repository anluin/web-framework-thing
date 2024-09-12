// Available inside server side rendering context
// Can be used to manipulate the response
declare global {
    const server: {
        readonly response: Response;

        readonly bundle: {
            jsBundleFileName: string;
            cssBundleFileName?: string;
        };

        // TODO: Write useful comment
        cacheResponse: boolean;

        // Before the DOM is serialized and sent to the client,
        // all notified promises are waited for.
        notifyPendingPromise(promise: Promise<unknown>): void;
    } | undefined
};
