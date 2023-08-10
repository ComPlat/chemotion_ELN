import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Editor } from '@tinymce/tinymce-react';
import { Popover } from 'react-bootstrap';
import TextTemplateStore from 'src/stores/alt/stores/TextTemplateStore';
import ToolbarTemplateCreator from 'src/components/textTemplateToolbar/ToolbarTemplateCreator';

function ReactionDescriptionEditor(props) {
  const { value } = props;

  const editorRef = useRef(null);
  // const log = () => {
  //   if (editorRef.current) {
  //     console.log(editorRef.current.getContent());
  //   }
  // };

  const addCustomButton = () => {
    if (editorRef.current) {
      // Get the current toolbar configuration
      const currentToolbar = editorRef.current.options.get('toolbar');

      // Add the custom button to the toolbar configuration
      const newToolbar = `${currentToolbar} | customButton`;

      // Update the toolbar configuration
      editorRef.current.options.set('toolbar', newToolbar);

      // Refresh the editor to apply the changes
      // editorRef.current.destroy();
      // editorRef.current.init();
      editorRef.current.editorManager.execCommand('mceRemoveEditor', true, editorRef.current.id);
      editorRef.current.editorManager.execCommand('mceAddEditor', true, editorRef.current.id);
    }
  };

  const setValue = () => {
    const { onChange } = props;
    onChange(editorRef.current.getContent());
  }

  const templateCreatorPopover = () => {
    const templateStore = TextTemplateStore.getState();
    const { predefinedTemplateNames } = templateStore;
    const {
      template
    } = props;

    return (
      <Popover
        id="popover-positioned-top"
        title="Custom toolbar"
        className="analyses-template-creator"
      >
        <ToolbarTemplateCreator
          template={template}
          templateOptions={predefinedTemplateNames}
          updateTextTemplates={this.updateTextTemplates}
        />
      </Popover>
    );
  };

  return (
    <Editor
      tinymceScriptSrc="/tinymce/tinymce.min.js"
      onInit={(_evt, editor) => {
        editorRef.current = editor;
        return true;
      }}
      onEditorChange={(newValue) => setValue(newValue)}
      initialValue={value}
      init={{
        branding: false,
        statusbar: false,
        menubar: false,
        plugins: ['lists'],
        toolbar:
            'blocks bold italic underline numlist bullist subscript superscript',
        content_style:
            'body { font-family: Helvetica, Arial, sans-serif; font-size: 13px; font-feature-settings: "tnum"; }',
        setup: (editor) => {
          // Add a custom toolbar button
          editor.ui.registry.addButton('addCustomButton', {
            text: 'Add custom button',
            onAction: () => templateCreatorPopover,
          });
        },
      }}
    />
  );
}

export default ReactionDescriptionEditor;

ReactionDescriptionEditor.propTypes = {
  /* eslint-disable react/forbid-prop-types */
  template: PropTypes.object,
  value: PropTypes.object,
  onChange: PropTypes.func,
};

ReactionDescriptionEditor.defaultProps = {
  template: {},
  value: {},
  onChange: null,
};
