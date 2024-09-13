import { RequiredKeys, TagNameFromHtmlElement } from "./utils.ts";
import { computed, Effect, effect, peek, Signal, SignalifyProperties, withoutEffect, } from "./reactivity.ts";

import "./global.ts"; // deno-lint-ignore no-empty-interface

// deno-lint-ignore no-empty-interface
export interface AttributesTagNameMap {
}

export type AttributeValue =
    | string
    | number
    | boolean
    | undefined
    | typeof SKIP
    | ((this: HTMLElement, event: Event) => void);

export type LifecycleAttributes = {
    onMount?(): void;
    onUnmount?(): void;
};

export type GlobalAttributes = LifecycleAttributes & {
    accessKey?: string;
};

// deno-fmt-ignore
export type Attributes<TagName extends string | unknown = unknown>  =
    SignalifyProperties<
        GlobalAttributes & (
        TagName extends keyof AttributesTagNameMap
            ? AttributesTagNameMap[TagName]
            : Record<string, AttributeValue>
        )
    >

export type Children<TagName extends string | unknown = unknown> =
    (ShadowNode | Signal<ShadowNode>)[];

const SHADOW_NODE = Symbol();

declare global {
    interface HTMLElement {
        [SHADOW_NODE]?: ShadowElement;
    }

    interface Text {
        [SHADOW_NODE]?: ShadowText;
    }
}

abstract class ShadowNode {
    domNode?: Node;

    abstract inflate(): Node;
    abstract remove(): void;
    abstract replaceWith<T extends ShadowNode>(node: T): T;

    notifyMount() {
        this.domNode!.dispatchEvent(new CustomEvent("mount"));
    }

    notifyUnmount() {
        this.domNode!.dispatchEvent(new CustomEvent("unmount"));
    }
}

class ShadowText extends ShadowNode {
    readonly #data: string;
    readonly #attributes?: LifecycleAttributes;

    domNode?: Text;

    constructor(
        data: string,
        attributes?: LifecycleAttributes,
        domNode?: Text,
    ) {
        super();
        this.#data = data;
        this.domNode = domNode;
        this.#attributes = attributes;
    }

    #applyLifecycleAttributes(previousAttributes: LifecycleAttributes = {}) {
        for (
            const attributeName in {
                ...previousAttributes,
                ...this.#attributes,
            }
        ) {
            const nextValue =
                (this.#attributes as Record<string, unknown>)[attributeName];
            const previousValue =
                (previousAttributes as Record<string, unknown>)[attributeName];

            if (previousValue !== nextValue) {
                if (
                    attributeName.startsWith("on") && (
                        previousValue instanceof Function ||
                        nextValue instanceof Function
                    )
                ) {
                    const event = attributeName.slice(2).toLowerCase();

                    if (previousValue instanceof Function) {
                        this.domNode!.removeEventListener(
                            event,
                            previousValue as () => void,
                        );
                    }

                    if (nextValue instanceof Function) {
                        this.domNode!.addEventListener(
                            event,
                            nextValue as () => void,
                        );
                    }

                    continue;
                }

                throw new Error();
            }
        }
    }

    inflate() {
        if (this.domNode) {
            throw new Error("already inflated");
        }

        this.domNode = document.createTextNode(this.#data);
        this.domNode[SHADOW_NODE] = this;
        this.#applyLifecycleAttributes();

        return this.domNode;
    }

    remove() {
        this.domNode!.remove();
        this.domNode = undefined;
        this.notifyUnmount();
    }

    replaceWith<T extends ShadowNode>(node: T): T {
        this.notifyUnmount();

        if (node instanceof ShadowText) {
            (node.domNode = this.domNode)![SHADOW_NODE] = node;
            node.#applyLifecycleAttributes(this.#attributes);

            if (node.#data !== this.#data) {
                this.domNode!.data = node.#data;
            }
        } else {
            this.domNode!.replaceWith(node.inflate());
        }

        this.domNode = undefined;
        node.notifyMount();

        return node;
    }
}

class ShadowElement<TagName extends string = string> extends ShadowNode {
    readonly #tagName!: TagName;

    readonly #childEffects: Effect[] = [];
    readonly #attributeEffects: Effect[] = [];

    #attributes!: Attributes<TagName>;
    #children!: Children<TagName>;
    domNode?: HTMLElement;

    constructor(
        tagName: TagName,
        attributes: Attributes<TagName>,
        children: Children<TagName>,
        domNode?: HTMLElement,
    ) {
        super();
        this.#tagName = tagName;
        this.#attributes = attributes;
        this.#children = children;
        this.domNode = domNode;
    }

    #updateAttribute(
        attributeName: string,
        previousValue: unknown,
        nextValue: unknown,
    ) {
        if (previousValue !== nextValue) {
            if (
                attributeName.startsWith("on") && (
                    previousValue instanceof Function ||
                    nextValue instanceof Function
                )
            ) {
                const event = attributeName.slice(2).toLowerCase();

                if (previousValue instanceof Function) {
                    this.domNode!.removeEventListener(
                        event,
                        previousValue as () => void,
                    );
                }

                if (nextValue instanceof Function) {
                    this.domNode!.addEventListener(
                        event,
                        nextValue as () => void,
                    );
                }
            } else {
                if (attributeName in this.domNode!) {
                    // deno-lint-ignore no-explicit-any
                    (this.domNode as any)[attributeName] = nextValue;
                } else if (["string", "number"].includes(typeof nextValue)) {
                    this.domNode!.setAttribute(attributeName, `${nextValue}`);
                } else {
                    this.domNode!.toggleAttribute(attributeName, !!nextValue);
                }
            }
        }
    }

    #disposeAttributeEffects() {
        for (const effect of this.#attributeEffects.splice(0)) {
            effect[Symbol.dispose]();
        }
    }

    #applyAttributes(previousAttributes = {} as Attributes<TagName>) {
        for (const attributeName in previousAttributes) {
            const previousValue =
                (previousAttributes as Record<string, unknown>)[
                    attributeName
                ];

            if (attributeName in this.#attributes) {
                if (
                    (this.#attributes as Record<string, unknown>)[
                        attributeName
                    ] === SKIP
                ) {
                    (this.#attributes as Record<string, unknown>)[
                        attributeName
                    ] = previousValue;
                }

                continue;
            }

            this.#updateAttribute(attributeName, previousValue, undefined);
        }

        this.#disposeAttributeEffects();

        withoutEffect(() => {
            for (const attributeName in this.#attributes) {
                let previousValue = peek(
                    (previousAttributes as Record<string, unknown>)[
                        attributeName
                    ],
                );

                const nextValue = (this.#attributes as Record<string, unknown>)[
                    attributeName
                ];

                if (nextValue instanceof Signal) {
                    this.#attributeEffects.push(
                        effect(() =>
                            this.#updateAttribute(
                                attributeName,
                                previousValue,
                                previousValue = nextValue.value,
                            )
                        ),
                    );
                } else {
                    this.#updateAttribute(
                        attributeName,
                        previousValue,
                        nextValue,
                    );
                }
            }
        });
    }

    updateAttributes(attributes: Attributes<TagName>) {
        this.#applyAttributes(
            ([, this.#attributes] = [this.#attributes, attributes] as [
                Attributes<TagName>,
                Attributes<TagName>,
            ])[0],
        );

        return this;
    }

    #updateChild(previousChild?: ShadowNode, nextChild?: ShadowNode) {
        if (previousChild !== nextChild) {
            if (previousChild) {
                if (nextChild) {
                    previousChild.replaceWith(nextChild);
                } else {
                    previousChild.remove();
                }
            } else if (nextChild) {
                this.domNode!.appendChild(nextChild.inflate());
                nextChild.notifyMount();
            }
        }
    }

    #disposeChildEffects() {
        for (const effect of this.#childEffects.splice(0)) {
            effect[Symbol.dispose]();
        }
    }

    #applyChildren(previousChildren = [] as Children<TagName>) {
        const maxLength = Math.max(
            previousChildren.length,
            this.#children.length,
        );

        this.#disposeChildEffects();

        withoutEffect(() => {
            for (let index = 0; index < maxLength; ++index) {
                let previousChild = peek(previousChildren.at(index));
                const nextChild = this.#children.at(index);

                if (nextChild instanceof Signal) {
                    this.#childEffects.push(effect(() => {
                        this.#updateChild(
                            previousChild,
                            previousChild = nextChild.value,
                        );
                    }));
                } else {
                    this.#updateChild(previousChild, nextChild);
                }
            }
        });
    }

    updateChildren(children: Children<TagName>) {
        this.#applyChildren(
            ([, this.#children] = [this.#children, children] as [
                Children<TagName>,
                Children<TagName>,
            ])[0],
        );

        return this;
    }

    inflate(): Node {
        if (this.domNode) {
            throw new Error("already inflated");
        }

        this.domNode = document.createElement(this.#tagName);
        this.domNode[SHADOW_NODE] = this;

        this.#applyAttributes();
        this.#applyChildren();

        return this.domNode;
    }

    remove() {
        this.#disposeChildEffects();
        this.#disposeAttributeEffects();

        this.domNode!.remove();
        this.domNode = undefined;
        this.notifyUnmount();

        for (const child of this.#children) {
            peek(child).remove();
        }
    }

    replaceWith<T extends ShadowNode>(node: T): T {
        this.notifyUnmount();
        this.#disposeChildEffects();
        this.#disposeAttributeEffects();

        if (node instanceof ShadowElement && node.#tagName === this.#tagName) {
            (node.domNode = this.domNode)![SHADOW_NODE] = node;
            node.#applyAttributes(this.#attributes);
            node.#applyChildren(this.#children);
        } else {
            this.domNode!.replaceWith(node.inflate());
        }

        this.domNode = undefined;
        node.notifyMount();

        return node;
    }
}

export const placeholder = (attributes?: {
    onMount?(): void;
    onUnmount?(): void;
}) => new ShadowText("", attributes);

export const text = (
    <T extends unknown[] = []>(
        dataOrTemplateStringArray:
            | TemplateStringsArray
            | unknown
            | Signal<unknown>,
        ...templateStringValues: T
    ) => {
        if (dataOrTemplateStringArray instanceof Array) {
            const [firstString, ...strings] = dataOrTemplateStringArray;

            return strings
                .reduce<Children>(
                    (carry, string, index) => [
                        ...carry,
                        text(templateStringValues[index]),
                        text(string),
                    ],
                    [text(firstString)],
                );
        }

        return (
            dataOrTemplateStringArray instanceof Signal
                ? computed(() =>
                    new ShadowText(`${dataOrTemplateStringArray.value}`)
                )
                : new ShadowText(`${dataOrTemplateStringArray}`)
        );
    }
) as {
    <T extends unknown[] = []>(
        [firstString, ...strings]: TemplateStringsArray,
        ..._: T
    ): [] extends T ? [ShadowText] : [
        ShadowText,
        ...{
            [K in keyof T]: T[K] extends Signal<unknown> ? Signal<ShadowText>
                : ShadowText;
        },
        ShadowText,
    ];
    <T extends unknown | Signal<unknown>>(
        data: T,
    ): T extends Signal<unknown> ? Signal<ShadowText> : ShadowText;
};

// deno-fmt-ignore
export type ElementInflater<TagName extends string> = {
    (): ShadowElement<TagName>;
    (children: Children<TagName>): ShadowElement<TagName>;
    (attributes: Attributes<TagName>): ShadowElement<TagName>;
    (attributes: Attributes<TagName>, children: Children<TagName>): ShadowElement<TagName>;
};

// deno-fmt-ignore
export const createShadowElementInflater =
    <TagName extends string>(tagName: TagName): ElementInflater<TagName> =>
        (attributesOrChildren= {}, optionalChildren = []) =>
            new ShadowElement(tagName, ...(
                attributesOrChildren instanceof Array
                    ? [ {}, attributesOrChildren ]
                    : [ attributesOrChildren, optionalChildren ]
            ) as [ Attributes<TagName>,  Children<TagName> ]);

// deno-fmt-ignore
// deno-lint-ignore no-explicit-any
export const element = new Proxy<any>({}, {
    get: (target, property, receiver) =>
        typeof property === "string"
            ? target[property] ??= createShadowElementInflater(property)
            : Reflect.get(target, property, receiver)
}) as {
    [TagName in keyof HTMLElementTagNameMap]: RequiredKeys<Attributes<TagName>> extends never
        ? {
            (): ShadowElement<TagName>;
            (children: Children<TagName>): ShadowElement<TagName>;
            (attributes: Attributes<TagName>): ShadowElement<TagName>;
            (attributes: Attributes<TagName>, children: Children<TagName>): ShadowElement<TagName>;
        }
        : {
            (attributes: Attributes<TagName>): ShadowElement<TagName>;
            (attributes: Attributes<TagName>, children: Children<TagName>): ShadowElement<TagName>;
        };
};

// @deno-fmt-ignore
export type RestoreResult<T extends Node> =
    T extends Text
        ? ShadowText
        : T extends HTMLElement
            ? ShadowElement<TagNameFromHtmlElement<T>>
            : ShadowNode;

export const restore = <T extends Node>(node: T): RestoreResult<T> => {
    if (node instanceof Text) {
        return (node[SHADOW_NODE] ??= new ShadowText(
            node.data ?? "",
            {},
            node,
        )) as RestoreResult<T>;
    }

    if (node instanceof HTMLElement) {
        return (node[SHADOW_NODE] ??= new ShadowElement(
            node.tagName.toLowerCase(),
            Object.fromEntries(
                [...node.attributes]
                    .map(({ name, value }) => [name, value]),
            ),
            [...node.childNodes]
                .map(restore),
            node,
        )) as RestoreResult<T>;
    }

    throw new Error(`restore is not implemented for ${node.constructor.name}`);
};

export const SKIP = Symbol();
