export type SignalifyProperties<T> = {
    [K in keyof T]: T[K] | Signal<T[K]>;
};

let currentSignalCollection: Set<Signal<unknown>> | undefined;

const collectSignals = <T>(callback: () => T) => {
    const previousSignalCollection = currentSignalCollection;

    try {
        return [
            currentSignalCollection = new Set<Signal<unknown>>(),
            callback(),
        ] as const;
    } finally {
        currentSignalCollection = previousSignalCollection;
    }
};

export class Signal<T> {
    readonly #subscribers = new Set<() => void>();

    #value: T;

    constructor(value: T) {
        this.#value = value;
    }

    get peekValue() {
        return this.#value;
    }

    get value() {
        currentSignalCollection?.add(this);
        return this.#value;
    }

    set value(value: T) {
        this.#value = value;

        for (const subscriber of [...this.#subscribers]) {
            if (this.#subscribers.has(subscriber)) {
                subscriber();
            }
        }
    }

    get numSubscribers() {
        return this.#subscribers.size;
    }

    subscribe(callback: () => void) {
        this.#subscribers.add(callback);
    }

    unsubscribe(callback: () => void) {
        this.#subscribers.delete(callback);
    }
}

export class ComputedSignal<T> extends Signal<T> {
    readonly #callback: () => void;

    #effect?: Effect;

    constructor(callback: () => T) {
        super(undefined as T);
        this.#callback = () => {
            super.value = callback();
        };
    }

    #cleanup() {
        if (!this.#effect) return;

        queueMicrotask(() => {
            if (this.numSubscribers === 0) {
                this.#effect?.[Symbol.dispose]();
                this.#effect = undefined;
            }
        });
    }

    #initEffect() {
        if (this.#effect) return;
        this.#effect = withoutEffect(effect, this.#callback);
        this.#cleanup();
    }

    get peekValue() {
        this.#initEffect();
        return super.peekValue;
    }

    get value() {
        this.#initEffect();
        return super.value;
    }

    protected set value(value: T) {
        throw new Error();
    }

    subscribe(callback: () => void) {
        super.subscribe(callback);
        this.#initEffect();
    }

    unsubscribe(callback: () => void) {
        super.unsubscribe(callback);
        this.#cleanup();
    }
}

let currentEffect: Effect | undefined;

export class Effect {
    readonly #usedSignals = new Map<Signal<unknown>, unknown>();
    readonly #run: () => void;

    constructor(callback: () => void) {
        if (currentEffect) {
            throw new Error("nested effects are not implemented yet");
        }

        (this.#run = (forceDirty = false) => {
            if (forceDirty || this.isDirty) {
                const previousEffect = currentEffect;

                try {
                    currentEffect = this;

                    const [usedSignals] = collectSignals(callback);

                    for (const signal of this.#usedSignals.keys()) {
                        if (!usedSignals.has(signal)) {
                            signal.unsubscribe(this.#run);
                        }
                    }

                    for (const signal of usedSignals) {
                        if (!this.#usedSignals.has(signal)) {
                            signal.subscribe(this.#run);
                        }

                        this.#usedSignals.set(signal, signal.peekValue);
                    }
                } finally {
                    currentEffect = previousEffect;
                }
            }
        })(true);
    }

    get isDirty() {
        for (const [signal, value] of this.#usedSignals) {
            if (signal.peekValue !== value) {
                return true;
            }
        }

        return false;
    }

    [Symbol.dispose]() {
        for (const usedSignal of this.#usedSignals.keys()) {
            usedSignal.unsubscribe(this.#run);
        }

        this.#usedSignals.clear();
    }
}

// deno-fmt-ignore
export const signal: {
    <T>(): Signal<T | undefined>;
    <T>(value: T): Signal<T>;
} = <T>(value?: T) =>
    new Signal(value);

// deno-fmt-ignore
export const computed =
    <T>(callback: () => T) =>
        new ComputedSignal(callback);

// deno-fmt-ignore
export const effect =
    (callback: () => void) =>
        new Effect(callback);

export function withoutEffect<T, This, Args extends unknown[] = []>(
    this: This,
    fn: (this: This, ...args: Args) => T,
    ...args: Args
) {
    const previousEffect = currentEffect;

    try {
        currentEffect = undefined;

        return fn.apply(this, args);
    } finally {
        currentEffect = previousEffect;
    }
}

export const unwrap = <T>(value: T | Signal<T>): T =>
    value instanceof Signal ? value.value : value;

export const peek = <T>(value: T | Signal<T>): T =>
    value instanceof Signal ? value.peekValue : value;
