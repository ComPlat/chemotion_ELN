import React from 'react';
import PropTypes from 'prop-types';
import Delta from 'quill-delta';
import { Button, Form, InputGroup } from 'react-bootstrap';

import QuillEditor from 'src/components/QuillEditor';
import TextTemplateIcon from 'src/apps/admin/textTemplates/TextTemplateIcon';


export default class TextTemplateForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      text: props.selectedTemplate?.data?.text ?? '',
      icon: props.selectedTemplate?.data?.icon ?? '',
    };

    this.reactQuillRef = React.createRef();

    this.onChangeText = this.onChangeText.bind(this);
    this.onChangeIcon = this.onChangeIcon.bind(this);
    this.saveTemplate = this.saveTemplate.bind(this);

  }

  componentDidUpdate(prevProps) {
    const { selectedTemplate } = this.props;
    if (selectedTemplate !== prevProps.selectedTemplate) {
      this.setState({
        text: selectedTemplate?.data?.text ?? '',
        icon: selectedTemplate?.data?.icon ?? '',
      });
    }
  }

  onChangeText(e) {
    const { value } = e.target;
    this.setState({ text: value });
  }

  onChangeIcon(e) {
    const { value } = e.target;
    this.setState({ icon: value });
  }

  saveTemplate() {
    if (this.reactQuillRef.current == null) {
      return;
    }

    const quill = this.reactQuillRef.current;
    const delta = quill.getContents();

    // Quill automatically append a trailing newline, we don't want that
    // Remove it !!!
    const deltaLength = delta.length();
    const removeTrailingNewline = new Delta().retain(deltaLength - 1).delete(1);
    const { ops } = delta.compose(removeTrailingNewline);

    const { selectedTemplate, updateTemplate } = this.props;
    const { text, icon } = this.state;
    updateTemplate({
      ...selectedTemplate,
      data: {
        ops,
        text: text.trim() == '' ? null : text.trim(),
        icon: icon.trim() == '' ? null : icon.trim(),
      }
    });
  }

  render() {
    const { selectedTemplate } = this.props;
    const { text, icon } = this.state;

    return (
      <div>
        <h3>Editing '{selectedTemplate.name}'</h3>
        <InputGroup className="mb-3">
          <InputGroup.Text className='fs-5 fw-bold me-3'>Preview</InputGroup.Text>
          <TextTemplateIcon
            iconClass='fs-3 my-3'
            template={selectedTemplate}
          />
        </InputGroup>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label className='fs-5'>Text</Form.Label>
            <Form.Control
              type="text"
              value={text}
              onChange={this.onChangeText}
              className='py-3'
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label className='fs-5'>Icon</Form.Label>
            <Form.Control
              type="text"
              value={icon}
              onChange={this.onChangeIcon}
              className='py-3'
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <QuillEditor
              ref={this.reactQuillRef}
              value={selectedTemplate.data}
              onChange={() => {}}
            />
          </Form.Group>
        </Form>
        <Button variant="primary" onClick={this.saveTemplate}>
          Save
        </Button>
      </div>
    );
  }
}

TextTemplateForm.propTypes = {
  selectedTemplate: PropTypes.object,
  updateTemplate: PropTypes.func.isRequired,
};

TextTemplateForm.defaultProps = {
  selectedTemplate: null,
};
