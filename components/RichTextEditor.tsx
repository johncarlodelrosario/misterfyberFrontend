// components/RichTextEditor.tsx

"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your message here...",
  minHeight = "200px",
  maxHeight = "400px",
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // State para malaman kung anong formatting ang active
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  });

  useEffect(() => {
    if (editorRef.current && !isInitialized) {
      editorRef.current.innerHTML = value || "";
      setIsInitialized(true);
    }
  }, [value, isInitialized]);

  useEffect(() => {
    if (editorRef.current && isInitialized) {
      const currentContent = editorRef.current.innerHTML;
      if (currentContent !== value && value !== undefined) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value, isInitialized]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const isEmpty = useCallback(() => {
    if (!editorRef.current) return true;
    const content = editorRef.current.innerHTML;
    return (
      content === "" ||
      content === "<br>" ||
      content === "<br />" ||
      content === " " ||
      content === "<div><br></div>"
    );
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }, []);

  // Check kung anong formatting ang active sa selected text
  const checkActiveFormats = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) {
      setActiveFormats({
        bold: false,
        italic: false,
        underline: false,
        strike: false,
      });
      return;
    }

    const range = sel.getRangeAt(0);
    let node = range.commonAncestorContainer;

    // Kung text node, kunin ang parent element
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode as Node;
    }

    let bold = false;
    let italic = false;
    let underline = false;
    let strike = false;

    // Check parent elements para sa formatting
    let element = node as HTMLElement;
    while (element && element !== editorRef.current) {
      const tagName = element.tagName?.toLowerCase() || "";
      const styles = window.getComputedStyle(element);

      if (
        tagName === "strong" ||
        tagName === "b" ||
        styles.fontWeight === "700" ||
        styles.fontWeight === "bold"
      ) {
        bold = true;
      }
      if (
        tagName === "em" ||
        tagName === "i" ||
        styles.fontStyle === "italic"
      ) {
        italic = true;
      }
      if (tagName === "u" || styles.textDecoration.includes("underline")) {
        underline = true;
      }
      if (
        tagName === "strike" ||
        tagName === "s" ||
        styles.textDecoration.includes("line-through")
      ) {
        strike = true;
      }

      element = element.parentElement as HTMLElement;
    }

    setActiveFormats({ bold, italic, underline, strike });
  }, []);

  // TOGGLE BOLD
  const toggleBold = useCallback(() => {
    document.execCommand("bold");
    handleInput();
    editorRef.current?.focus();
    setTimeout(checkActiveFormats, 50);
  }, [handleInput, checkActiveFormats]);

  // TOGGLE ITALIC
  const toggleItalic = useCallback(() => {
    document.execCommand("italic");
    handleInput();
    editorRef.current?.focus();
    setTimeout(checkActiveFormats, 50);
  }, [handleInput, checkActiveFormats]);

  // TOGGLE UNDERLINE
  const toggleUnderline = useCallback(() => {
    document.execCommand("underline");
    handleInput();
    editorRef.current?.focus();
    setTimeout(checkActiveFormats, 50);
  }, [handleInput, checkActiveFormats]);

  // TOGGLE STRIKE
  const toggleStrike = useCallback(() => {
    document.execCommand("strikeThrough");
    handleInput();
    editorRef.current?.focus();
    setTimeout(checkActiveFormats, 50);
  }, [handleInput, checkActiveFormats]);

  // BULLET LIST
  const toggleBulletList = useCallback(() => {
    document.execCommand("insertUnorderedList");
    handleInput();
    editorRef.current?.focus();
  }, [handleInput]);

  // NUMBERED LIST
  const toggleNumberedList = useCallback(() => {
    document.execCommand("insertOrderedList");
    handleInput();
    editorRef.current?.focus();
  }, [handleInput]);

  // HIGHLIGHT
  const toggleHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editorRef.current) return;

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();

    if (selectedText) {
      const parent = range.commonAncestorContainer.parentElement;
      if (parent?.style?.backgroundColor === "#fef08a") {
        const text = parent.textContent || "";
        const textNode = document.createTextNode(text);
        parent.parentNode?.replaceChild(textNode, parent);
        const newRange = document.createRange();
        newRange.selectNodeContents(textNode);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        const span = document.createElement("span");
        span.style.backgroundColor = "#fef08a";
        span.style.padding = "2px 4px";
        span.style.borderRadius = "3px";
        span.textContent = selectedText;
        range.deleteContents();
        range.insertNode(span);
        range.selectNodeContents(span);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    handleInput();
    editorRef.current?.focus();
  }, [handleInput]);

  // INSERT LINK
  const insertLink = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || "";
    const url = window.prompt("Enter URL:", "https://");

    if (url) {
      if (selectedText) {
        document.execCommand("createLink", false, url);
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.textContent = url;
        link.target = "_blank";
        const range = selection?.getRangeAt(0);
        if (range) {
          range.insertNode(link);
          range.setStartAfter(link);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }
      handleInput();
      editorRef.current?.focus();
    }
  }, [handleInput]);

  // CLEAR FORMATTING
  const clearFormatting = useCallback(() => {
    document.execCommand("removeFormat");
    handleInput();
    editorRef.current?.focus();
    setTimeout(checkActiveFormats, 50);
  }, [handleInput, checkActiveFormats]);

  return (
    <div className="relative border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-300 sticky top-0 z-10">
        {/* BOLD - may highlight pag active */}
        <button
          type="button"
          onClick={toggleBold}
          onMouseDown={(e) => e.preventDefault()}
          className={`p-1.5 rounded transition-colors w-8 h-8 flex items-center justify-center ${
            activeFormats.bold
              ? "bg-blue-500 text-white shadow-md"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Bold"
        >
          <span
            className={`font-bold text-sm ${activeFormats.bold ? "text-white" : "text-gray-700"}`}
          >
            B
          </span>
        </button>

        {/* ITALIC - may highlight pag active */}
        <button
          type="button"
          onClick={toggleItalic}
          onMouseDown={(e) => e.preventDefault()}
          className={`p-1.5 rounded transition-colors w-8 h-8 flex items-center justify-center ${
            activeFormats.italic
              ? "bg-blue-500 text-white shadow-md"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Italic"
        >
          <span
            className={`italic text-sm ${activeFormats.italic ? "text-white" : "text-gray-700"}`}
          >
            I
          </span>
        </button>

        {/* UNDERLINE - may highlight pag active */}
        <button
          type="button"
          onClick={toggleUnderline}
          onMouseDown={(e) => e.preventDefault()}
          className={`p-1.5 rounded transition-colors w-8 h-8 flex items-center justify-center ${
            activeFormats.underline
              ? "bg-blue-500 text-white shadow-md"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Underline"
        >
          <span
            className={`underline text-sm ${activeFormats.underline ? "text-white" : "text-gray-700"}`}
          >
            U
          </span>
        </button>

        {/* STRIKE - may highlight pag active */}
        <button
          type="button"
          onClick={toggleStrike}
          onMouseDown={(e) => e.preventDefault()}
          className={`p-1.5 rounded transition-colors w-8 h-8 flex items-center justify-center ${
            activeFormats.strike
              ? "bg-blue-500 text-white shadow-md"
              : "hover:bg-gray-200 text-gray-700"
          }`}
          title="Strikethrough"
        >
          <span
            className={`line-through text-sm ${activeFormats.strike ? "text-white" : "text-gray-700"}`}
          >
            S
          </span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* HIGHLIGHT */}
        <button
          type="button"
          onClick={toggleHighlight}
          onMouseDown={(e) => e.preventDefault()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors w-8 h-8 flex items-center justify-center"
          title="Highlight"
        >
          <span className="text-gray-700 text-sm">🖍️</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* BULLET LIST */}
        <button
          type="button"
          onClick={toggleBulletList}
          onMouseDown={(e) => e.preventDefault()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors px-2 text-sm text-gray-700"
          title="Bullet List"
        >
          <span>•</span>
        </button>

        {/* NUMBERED LIST */}
        <button
          type="button"
          onClick={toggleNumberedList}
          onMouseDown={(e) => e.preventDefault()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors px-2 text-sm text-gray-700"
          title="Numbered List"
        >
          <span>1.</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* LINK */}
        <button
          type="button"
          onClick={insertLink}
          onMouseDown={(e) => e.preventDefault()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors w-8 h-8 flex items-center justify-center"
          title="Insert Link"
        >
          <span className="text-gray-700 text-sm">🔗</span>
        </button>

        {/* CLEAR FORMATTING */}
        <button
          type="button"
          onClick={clearFormatting}
          onMouseDown={(e) => e.preventDefault()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors w-8 h-8 flex items-center justify-center"
          title="Clear Formatting"
        >
          <span className="text-gray-700 text-sm">🧹</span>
        </button>
      </div>

      {/* Editor Container */}
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setTimeout(checkActiveFormats, 50);
          }}
          onMouseUp={() => {
            setTimeout(checkActiveFormats, 50);
          }}
          onKeyUp={() => {
            setTimeout(checkActiveFormats, 50);
          }}
          onClick={() => {
            setTimeout(checkActiveFormats, 50);
          }}
          className="p-3 outline-none overflow-y-auto prose prose-sm max-w-none text-gray-900"
          style={{
            minHeight: minHeight,
            maxHeight: maxHeight,
          }}
          suppressContentEditableWarning
        />

        {isEmpty() && !isFocused && (
          <div
            className="absolute pointer-events-none text-gray-400 select-none"
            style={{
              top: "12px",
              left: "12px",
              right: "12px",
            }}
          >
            {placeholder}
          </div>
        )}
      </div>

      <div className="px-3 py-1 text-xs text-gray-400 border-t border-gray-100 bg-gray-50 text-right">
        {value?.replace(/<[^>]*>/g, "").length || 0} characters
      </div>
    </div>
  );
}
