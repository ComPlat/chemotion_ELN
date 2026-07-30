/* eslint-disable max-len */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import {
  Form,
} from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import QuillEditor from 'src/components/QuillEditor';
import Delta from 'quill-delta';
import { markdownToDelta } from 'src/utilities/deltaMarkdownConverter';
import { draftContentToDelta, isDraftContent } from 'src/utilities/ketcherSurfaceChemistry/deltaDraftContentConverter';

function TextEditorModal({
  loading = false,
  title = 'Text Editor',
  onCloseClick = null,
  onApply = null,
  initialValue = null,
  initialText = null
}) {
  const toDelta = (value) => {
    if (value == null || value === '') return new Delta();
    if (isDraftContent(value)) return draftContentToDelta(value);
    try {
      return markdownToDelta(value);
    } catch {
      return new Delta().insert(typeof value === 'string' ? value : String(value));
    }
  };

  // Convert initial text / Draft content / markdown to Delta if provided
  const getInitialDelta = () => {
    if (initialValue) return initialValue;
    if (initialText != null) return toDelta(initialText);
    return new Delta();
  };

  const [editorValue, setEditorValue] = useState(getInitialDelta());

  // Update editor value when initialText changes (when modal opens with different text)
  React.useEffect(() => {
    if (loading && initialText !== null) {
      setEditorValue(toDelta(initialText));
    } else if (loading && !initialText) {
      setEditorValue(new Delta());
    }
  }, [loading, initialText]);

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
  initialText: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      blocks: PropTypes.arrayOf(PropTypes.shape({})),
      entityMap: PropTypes.shape({})
    })
  ])
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
