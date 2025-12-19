/* eslint-disable max-len */
import PropTypes from 'prop-types';
import React, { useState } from 'react';
import {
  Button, Form, Modal
} from 'react-bootstrap';
import QuillEditor from 'src/components/QuillEditor';
import Delta from 'quill-delta';

function TextEditorModal({
  loading = false,
  title = 'Text Editor',
  onCloseClick = null,
  onApply = null,
  initialValue = null,
  initialText = null
}) {
  // Convert initial text string to Delta if provided
  const getInitialDelta = () => {
    if (initialValue) return initialValue;
    if (initialText) {
      return new Delta().insert(initialText);
    }
    return new Delta();
  };

  const [editorValue, setEditorValue] = useState(getInitialDelta());

  // Update editor value when initialText changes (when modal opens with different text)
  React.useEffect(() => {
    if (loading && initialText !== null) {
      setEditorValue(new Delta().insert(initialText));
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

  const handleCancel = () => {
    if (onCloseClick) {
      onCloseClick();
    }
  };

  return (
    <Modal
      centered
      className="w-500 h-500 top-50 start-50 translate-middle"
      animation
      show={loading}
      onHide={onCloseClick}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <style>
          {`
            .text-editor-quill .ql-editor.ql-blank::before {
              content: '1wt.% Pt, γ-Al2O3 and more...';
              color: #999;
              font-style: Helvetica, Arial, sans-serif;
            }
          `}
        </style>
        <Form.Group className="mb-3">
          <div className="text-editor-quill" style={{ border: '0px solid #ced4da', borderRadius: '4px' }}>
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
          <div style={{
            marginTop: '12px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px'
          }}
          >
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleApply}>Apply</Button>
          </div>
        </Form.Group>
      </Modal.Body>
    </Modal>
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
