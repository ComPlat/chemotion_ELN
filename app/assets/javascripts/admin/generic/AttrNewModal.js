import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Modal, Button } from 'react-bootstrap';
import { Content } from './AttrForm';

export default class AttrNewModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
  }

  handleCreate() {
    const { fnCreate, content } = this.props;
    switch (content) {
      case 'Segment': {
        const element = {
          label: this.formRef.current.k_label.value.trim(),
          desc: this.formRef.current.k_desc.value.trim(),
          element_klass: this.formRef.current.k_klass.value,
          place: this.formRef.current.k_place.value,
        };
        fnCreate(element);
        break;
      }
      case 'Klass': {
        const element = {
          name: this.formRef.current.k_name.value.trim(),
          label: this.formRef.current.k_label.value.trim(),
          klass_prefix: this.formRef.current.k_prefix.value.trim(),
          icon_name: this.formRef.current.k_iconname.value.trim(),
          desc: this.formRef.current.k_desc.value.trim(),
          place: this.formRef.current.k_place.value
        };
        fnCreate(element);
        break;
      }
      default:
        console.log(`Warning: ${content} is not supported.`);
    }
  }

  render() {
    const { content, showModal, fnClose } = this.props;
    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>{`New ${content}`}</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <Content ref={this.formRef} content={content} element={{}} editable />;
            <Form horizontal>
              <FormGroup>
                <Button bsStyle="primary" onClick={() => this.handleCreate()}>Create&nbsp;<i className="fa fa-save" aria-hidden="true" /></Button>
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

AttrNewModal.propTypes = {
  content: PropTypes.string.isRequired,
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnCreate: PropTypes.func.isRequired,
};
