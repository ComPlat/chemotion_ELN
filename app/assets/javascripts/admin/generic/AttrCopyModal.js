import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Modal, Button, OverlayTrigger } from 'react-bootstrap';
import { Content, TipActive, TipInActive, TipDelete } from './AttrForm';

export default class AttrCopyModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
  }

  handleCopy() {
    const { element, fnCopy, content } = this.props;
    switch (content) {
      case 'Segment': {
        const copy = {
          label: this.formRef.current.k_label.value.trim(),
          desc: this.formRef.current.k_desc.value.trim(),
          element_klass: this.formRef.current.k_klass.value,
          place: this.formRef.current.k_place.value,
          properties_template: element.properties_template
        };
        fnCopy(copy);
        break;
      }
      case 'Klass': {
        const copy = {
          name: this.formRef.current.k_name.value.trim(),
          label: this.formRef.current.k_label.value.trim(),
          klass_prefix: this.formRef.current.k_prefix.value.trim(),
          icon_name: this.formRef.current.k_iconname.value.trim(),
          desc: this.formRef.current.k_desc.value.trim(),
          place: this.formRef.current.k_place.value,
          properties_template: element.properties_template
        };
        fnCopy(copy);
        break;
      }
      default:
        console.log(`Warning: ${content} is not supported.`);
    }
  }

  render() {
    const {
      content, element, showModal, fnClose
    } = this.props;

    const copy = {
      label: element.label,
      klass_prefix: element.klass_prefix,
      icon_name: element.icon_name,
      desc: element.desc,
      place: element.place,
      properties_template: element.properties_template
    };

    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton>
          <Modal.Title>Copy {content} attributes</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <Content ref={this.formRef} content={content} element={copy} editable />;
            <Form horizontal>
              <FormGroup>
                &nbsp;
                <Button bsStyle="primary" onClick={() => this.handleCopy()}>Copy&nbsp;<i className="fa fa-save" aria-hidden="true" /></Button>
                &nbsp;
                <Button bsStyle="warning" onClick={() => fnClose()}>Cancel</Button>
              </FormGroup>
            </Form>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

AttrCopyModal.propTypes = {
  content: PropTypes.string.isRequired,
  showModal: PropTypes.bool.isRequired,
  element: PropTypes.object.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnCopy: PropTypes.func.isRequired,
};
