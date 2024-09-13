export type RequiredKeys<T> = {
    // deno-lint-ignore ban-types
    [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];


// TODO: Add more?
// @deno-fmt-ignore
export type TagNameFromHtmlElement<T extends HTMLElement> =
    HTMLElement extends T ? string :
    HTMLAnchorElement extends T ? "a" :
    HTMLAreaElement extends T ? "area" :
    HTMLAudioElement extends T ? "audio" :
    HTMLBaseElement extends T ? "base" :
    HTMLQuoteElement extends T ? "blockquote" :
    HTMLBodyElement extends T ? "body" :
    HTMLBRElement extends T ? "br" :
    HTMLButtonElement extends T ? "button" :
    HTMLCanvasElement extends T ? "canvas" :
    HTMLTableCaptionElement extends T ? "caption" :
    HTMLTableColElement extends T ? "col" :
    HTMLTableColElement extends T ? "colgroup" :
    HTMLDataElement extends T ? "data" :
    HTMLDataListElement extends T ? "datalist" :
    HTMLModElement extends T ? "del" :
    HTMLDetailsElement extends T ? "details" :
    HTMLDialogElement extends T ? "dialog" :
    HTMLDivElement extends T ? "div" :
    HTMLDListElement extends T ? "dl" :
    HTMLEmbedElement extends T ? "embed" :
    HTMLFieldSetElement extends T ? "fieldset" :
    HTMLFormElement extends T ? "form" :
    HTMLHeadingElement extends T ? "h1" :
    HTMLHeadingElement extends T ? "h2" :
    HTMLHeadingElement extends T ? "h3" :
    HTMLHeadingElement extends T ? "h4" :
    HTMLHeadingElement extends T ? "h5" :
    HTMLHeadingElement extends T ? "h6" :
    HTMLHeadElement extends T ? "head" :
    HTMLHRElement extends T ? "hr" :
    HTMLHtmlElement extends T ? "html" :
    HTMLIFrameElement extends T ? "iframe" :
    HTMLImageElement extends T ? "img" :
    HTMLInputElement extends T ? "input" :
    HTMLModElement extends T ? "ins" :
    HTMLLabelElement extends T ? "label" :
    HTMLLegendElement extends T ? "legend" :
    HTMLLIElement extends T ? "li" :
    HTMLLinkElement extends T ? "link" :
    HTMLMapElement extends T ? "map" :
    HTMLMenuElement extends T ? "menu" :
    HTMLMetaElement extends T ? "meta" :
    HTMLMeterElement extends T ? "meter" :
    HTMLObjectElement extends T ? "object" :
    HTMLOListElement extends T ? "ol" :
    HTMLOptGroupElement extends T ? "optgroup" :
    HTMLOptionElement extends T ? "option" :
    HTMLOutputElement extends T ? "output" :
    HTMLParagraphElement extends T ? "p" :
    HTMLPictureElement extends T ? "picture" :
    HTMLPreElement extends T ? "pre" :
    HTMLProgressElement extends T ? "progress" :
    HTMLQuoteElement extends T ? "q" :
    HTMLScriptElement extends T ? "script" :
    HTMLSelectElement extends T ? "select" :
    HTMLSlotElement extends T ? "slot" :
    HTMLSourceElement extends T ? "source" :
    HTMLSpanElement extends T ? "span" :
    HTMLStyleElement extends T ? "style" :
    HTMLTableElement extends T ? "table" :
    HTMLTableSectionElement extends T ? "tbody" :
    HTMLTableCellElement extends T ? "td" :
    HTMLTemplateElement extends T ? "template" :
    HTMLTextAreaElement extends T ? "textarea" :
    HTMLTableSectionElement extends T ? "tfoot" :
    HTMLTableCellElement extends T ? "th" :
    HTMLTableSectionElement extends T ? "thead" :
    HTMLTimeElement extends T ? "time" :
    HTMLTitleElement extends T ? "title" :
    HTMLTableRowElement extends T ? "tr" :
    HTMLTrackElement extends T ? "track" :
    HTMLUListElement extends T ? "ul" :
    HTMLVideoElement extends T ? "video" :
    HTMLElement extends T ? "wbr"
        : string;
