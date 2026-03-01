import React, { useCallback, useMemo, useState } from "react";
import { createEditor } from "slate";
import { Slate, Editable, withReact } from "slate-react";

function stringToValue(text) {
  // Split into paragraphs by newline
  return text.split("\n").map((line) => ({
    type: "paragraph",
    children: [{ text: line }],
  }));
}

function valueToString(value) {
  return value.map((n) => n.children?.[0]?.text ?? "").join("\n");
}

export function SlatePlainTextEditor({
  value,
  onChangeText,
  placeholder = "Type here…",
  className,
  minHeight = 120,
}) {
  const editor = useMemo(() => withReact(createEditor()), []);

  // Keep Slate value in local state; sync from props when needed
  const [slateValue, setSlateValue] = useState(stringToValue(value));

  // When user edits
  const handleChange = useCallback(
    (nextValue) => {
      setSlateValue(nextValue);
      onChangeText(valueToString(nextValue));
    },
    [onChangeText],
  );

  return (
    <div className={className}>
      <Slate editor={editor} initialValue={slateValue} onChange={handleChange}>
        <Editable
          placeholder={placeholder}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            minHeight: minHeight,
            overflow: "scroll",
            outline: "none",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            whiteSpace: "pre-wrap",
          }}
        />
      </Slate>
    </div>
  );
}
