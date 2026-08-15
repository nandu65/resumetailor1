/**
 * Rich-text formatting helpers for the resume preview.
 *
 * The preview is made of many small contentEditable "Editable" hosts, so a plain
 * `document.execCommand` only ever formats the host the caret sits in. These helpers
 * make formatting work across a selection that spans multiple words, paragraphs and
 * even multiple sections, and support copying / pasting a text format.
 */

export type TextFormat = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: string;
  fontFamily?: string;
};

const EDITABLE_SELECTOR = '[contenteditable="true"]';

function editableHost(node: Node | null): HTMLElement | null {
  let el: HTMLElement | null =
    node && node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement ?? null;
  while (el && !(el.isContentEditable && el.matches(EDITABLE_SELECTOR))) el = el.parentElement;
  return el;
}

/** Every editable host that the current selection touches (in document order). */
export function selectedEditableHosts(): HTMLElement[] {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return [];
  const range = sel.getRangeAt(0);
  const start = editableHost(range.startContainer);
  const end = editableHost(range.endContainer);
  if (start && start === end) return [start];

  const all = Array.from(document.querySelectorAll<HTMLElement>(EDITABLE_SELECTOR));
  const hosts = all.filter(el => range.intersectsNode(el));
  if (hosts.length) return hosts;
  return [start, end].filter(Boolean) as HTMLElement[];
}

function commit(el: HTMLElement) {
  // Editable commits on blur — dispatch it so React state picks the change up.
  el.dispatchEvent(new FocusEvent("blur", { bubbles: true }));
}

function wrapAll(el: HTMLElement, wrap: (html: string) => string) {
  el.innerHTML = wrap(el.innerHTML);
}

function styleWrapper(style: string) {
  return (html: string) => `<span style="${style}">${html}</span>`;
}

function currentFontSizePx(): number {
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  const el = node && node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
  const size = el ? parseFloat(window.getComputedStyle(el).fontSize) : 11;
  return Number.isFinite(size) ? size : 11;
}

/**
 * Apply a formatting command to the current selection.
 * Single-host selections use execCommand (keeps partial-word precision);
 * multi-host selections format each touched block entirely.
 */
export function applyFormatToSelection(command: string, value?: string) {
  const hosts = selectedEditableHosts();
  if (hosts.length === 0) return;

  if (hosts.length === 1) {
    const host = hosts[0];
    host.focus({ preventScroll: true });
    if (command === "fontSize") {
      const next = value === "decrease" ? currentFontSizePx() - 1 : currentFontSizePx() + 1;
      document.execCommand("fontSize", false, "7");
      Array.from(document.getElementsByTagName("font")).forEach(f => {
        if (f.getAttribute("size") === "7") {
          f.removeAttribute("size");
          f.style.fontSize = `${Math.max(6, Math.min(40, next))}px`;
        }
      });
    } else if (command === "fontName") {
      document.execCommand("fontName", false, value);
    } else {
      document.execCommand(command, false, value);
    }
    commit(host);
    return;
  }

  const size = command === "fontSize"
    ? Math.max(6, Math.min(40, value === "decrease" ? currentFontSizePx() - 1 : currentFontSizePx() + 1))
    : 0;

  hosts.forEach(host => {
    switch (command) {
      case "bold": wrapAll(host, h => `<b>${h}</b>`); break;
      case "italic": wrapAll(host, h => `<i>${h}</i>`); break;
      case "underline": wrapAll(host, h => `<u>${h}</u>`); break;
      case "removeFormat": host.innerHTML = host.innerText; break;
      case "fontSize": wrapAll(host, styleWrapper(`font-size:${size}px`)); break;
      case "fontName": wrapAll(host, styleWrapper(`font-family:${value}`)); break;
      default: break;
    }
    commit(host);
  });
}

/** Read the format of the current selection so it can be pasted elsewhere. */
export function copyFormatFromSelection(): TextFormat | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
  const node = sel.anchorNode;
  const el = node && node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node?.parentElement;
  if (!el) return null;
  const cs = window.getComputedStyle(el);
  return {
    bold: parseInt(cs.fontWeight, 10) >= 600 || cs.fontWeight === "bold",
    italic: cs.fontStyle === "italic",
    underline: cs.textDecorationLine.includes("underline"),
    fontSize: cs.fontSize,
    fontFamily: cs.fontFamily,
  };
}

/** Apply a previously copied format to the current selection. */
export function pasteFormatToSelection(fmt: TextFormat) {
  const hosts = selectedEditableHosts();
  if (!hosts.length) return;

  const style = [
    fmt.fontSize ? `font-size:${fmt.fontSize}` : "",
    fmt.fontFamily ? `font-family:${fmt.fontFamily}` : "",
    fmt.bold ? "font-weight:700" : "font-weight:400",
    fmt.italic ? "font-style:italic" : "font-style:normal",
    fmt.underline ? "text-decoration:underline" : "text-decoration:none",
  ].filter(Boolean).join(";");

  if (hosts.length === 1) {
    const host = hosts[0];
    host.focus({ preventScroll: true });
    document.execCommand("insertHTML", false, `<span style="${style}">${window.getSelection()?.toString() ?? ""}</span>`);
    commit(host);
    return;
  }
  hosts.forEach(host => {
    wrapAll(host, styleWrapper(style));
    commit(host);
  });
}

export function describeFormat(fmt: TextFormat) {
  const bits = [
    fmt.bold ? "Bold" : null,
    fmt.italic ? "Italic" : null,
    fmt.underline ? "Underline" : null,
    fmt.fontSize ? fmt.fontSize.replace("px", "px") : null,
  ].filter(Boolean);
  return bits.length ? bits.join(" · ") : "Default";
}
