/* eslint-disable max-len */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import {
  Form,
} from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import QuillEditor from 'src/components/QuillEditor';
import Delta from 'quill-delta';

// Convert a Draft.js content object to a Quill Delta preserving bold/italic/underline.
const draftToQuillDelta = (draftContent) => {
  const block = draftContent?.blocks?.[0];
  if (!block?.text) return new Delta();
  const { text, inlineStyleRanges = [] } = block;
  const charAttrs = Array.from({ length: text.length }, () => ({}));
  for (const range of inlineStyleRanges) {
    let attr;
    if (range.style === 'BOLD') attr = 'bold';
    else if (range.style === 'ITALIC') attr = 'italic';
    else if (range.style === 'UNDERLINE') attr = 'underline';
    else continue;
    for (let i = range.offset; i < Math.min(range.offset + range.length, text.length); i++) {
      charAttrs[i][attr] = true;
    }
  }
  const ops = [];
  let i = 0;
  while (i < text.length) {
    const key = JSON.stringify(charAttrs[i]);
    let j = i + 1;
    while (j < text.length && JSON.stringify(charAttrs[j]) === key) j += 1;
    const op = { insert: text.slice(i, j) };
    if (Object.keys(charAttrs[i]).length > 0) op.attributes = { ...charAttrs[i] };
    ops.push(op);
    i = j;
  }
  return new Delta(ops);
};

const parseDraftFromInitialText = (initialText) => {
  try {
    const parsed = JSON.parse(initialText);
    if (parsed?.blocks) return parsed;
  } catch { /* not JSON */ }
  return null;
};

function TextEditorModal({
  loading = false,
  title = 'Text Editor',
  onCloseClick = null,
  onApply = null,
  initialValue = null,
  initialText = null
}) {
  const getInitialDelta = () => {
    if (initialValue) return initialValue;
    if (initialText) {
      const draft = parseDraftFromInitialText(initialText);
      if (draft) return draftToQuillDelta(draft);
      return new Delta().insert(initialText);
    }
    return new Delta();
  };

  const [editorValue, setEditorValue] = useState(getInitialDelta());

  React.useEffect(() => {
    if (!loading) return;
    if (initialValue) {
      setEditorValue(initialValue);
    } else if (initialText !== null) {
      const draft = parseDraftFromInitialText(initialText);
      setEditorValue(draft ? draftToQuillDelta(draft) : new Delta().insert(initialText));
    } else {
      setEditorValue(new Delta());
    }
  }, [loading, initialText, initialValue]);

  const handleChange = (value) => {
    setEditorValue(value);
  };

  const handleApply = () => {
    if (onApply) {
      onApply(editorValue);
    }
    if (onCloseClick) {
      onCloseClick();
    }
  };

  return (
    <AppModal
      title={title}
      show={loading}
      onHide={onCloseClick}
      size="lg"
      closeLabel="Cancel"
      primaryActionLabel="Apply"
      onPrimaryAction={handleApply}
    >
      <Form.Group className="mb-3">
        <div className="text-editor-quill">
          <QuillEditor
            value={editorValue}
            onChange={handleChange}
            theme="snow"
            height="200px"
            disabled={false}
            toolbarSymbol={[]}
            toolbarDropdown={[]}
            customToolbar=""
          />
        </div>
      </Form.Group>
    </AppModal>
  );
}

TextEditorModal.propTypes = {
  loading: PropTypes.bool,
  title: PropTypes.string,
  onCloseClick: PropTypes.func,
  onApply: PropTypes.func,
  initialValue: PropTypes.shape({}),
  initialText: PropTypes.string
};

TextEditorModal.defaultProps = {
  loading: false,
  title: 'Text Editor',
  onCloseClick: null,
  onApply: null,
  initialValue: null,
  initialText: null
};

export default TextEditorModal;
