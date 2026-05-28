import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import PropTypes from 'prop-types';

// Custom TextArea Cell Editor for AG Grid
// Preserves multi-line content when pasting molfiles or any other text
const TextAreaCellEditor = forwardRef((props, ref) => {
  const [value, setValue] = useState(props.value || '');
  const textareaRef = React.useRef(null);
  const originalValue = React.useRef(props.value || '');

  // Update value from props
  useEffect(() => {
    originalValue.current = props.value || '';
    setValue(props.value || '');
  }, [props.value]);

  // Expose AG Grid required methods
  useImperativeHandle(ref, () => ({
    // This method is called by AG Grid to get the final value
    getValue() {
      return value;
    },

    // Called when editing starts
    afterGuiAttached() {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    },

    // Make sure editing is not canceled
    isCancelBeforeStart() {
      return false;
    },

    // Specify this is a popup editor
    isPopup() {
      return true;
    },

    // Always return true to force AG Grid to update the cell
    valueChanged() {
      return true;
    }
  }));

  // Handle textarea changes
  const handleChange = (event) => {
    const newValue = event.target.value;
    setValue(newValue);
    if (props.onValueChange) {
      props.onValueChange(newValue);
    }
  };

  // Handle paste events
  const handlePaste = (event) => {
    const pastedText = event.clipboardData.getData('text');
    if (pastedText) {
      setValue(pastedText);
      event.preventDefault();
    }
  };

  // Handle save action
  const handleSave = () => {
    if (props.onValueChange) {
      props.onValueChange(value);
    }

    // Stop editing to apply the change
    if (props.api) {
      props.api.stopEditing();
    }
  };

  // Handle cancel action
  const handleCancel = () => {
    setValue(originalValue.current);
    if (props.api) {
      props.api.stopEditing(false);
    }
  };

  // Add save/cancel buttons to make editing more explicit
  return (
    <div className="d-flex flex-column" style={{ height: '300px' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        className="form-control font-monospace"
        style={{
          height: '300px',
          whiteSpace: 'pre',
          resize: 'none'
        }}
      />
      <div className="d-flex justify-content-end mt-2 gap-2">
        <button
          type="button"
          onClick={handleCancel}
          className="btn btn-light btn-sm"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="btn btn-success btn-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
});

TextAreaCellEditor.propTypes = {
  value: PropTypes.string,
  api: PropTypes.shape({
    stopEditing: PropTypes.func
  }),
  onValueChange: PropTypes.func
};

TextAreaCellEditor.defaultProps = {
  value: '',
  api: null,
  onValueChange: null
};

TextAreaCellEditor.displayName = 'TextAreaCellEditor';

export default TextAreaCellEditor;
