import React, { useEffect } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $getRoot, $createTextNode } from "lexical";

function PlainTextLexicalEditor({
  value,
  onTextChange,
  placeholder,
  className,
}) {
  const initialConfig = {
    namespace: "PlainTextEditor",
    onError(error) {
      console.error(error);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="position-relative">
        <PlainTextPlugin
          contentEditable={
            <ContentEditable className={className} spellCheck={false} />
          }
          placeholder={
            <span className="position-absolute top-0 left-0 text-muted px-3 py-2">
              {placeholder}
            </span>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        <HistoryPlugin />
        <SetValuePlugin value={value} />
        <OnChangePlugin
          onChange={(editorState) => {
            editorState.read(() => {
              const text = $getRoot().getTextContent();
              onTextChange(text);
            });
          }}
        />
      </div>
    </LexicalComposer>
  );
}

/**
 * Sync external value → editor content
 * Prevents unnecessary overwrites (keeps cursor stable)
 */
function SetValuePlugin({ value }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.update(() => {
      const root = $getRoot();
      const currentText = root.getTextContent();

      if (currentText === value) return;

      root.clear();
      root.append($createTextNode(value));
    });
  }, [editor, value]);

  return null;
}

export default PlainTextLexicalEditor;
