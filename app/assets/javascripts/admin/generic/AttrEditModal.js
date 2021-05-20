import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Modal, Button, OverlayTrigger } from 'react-bootstrap';
import { Content, TipActive, TipInActive, TipDelete } from './AttrForm';

export default class AttrEditModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
  }

  handleUpdate() {
    const { element, fnUpdate, content } = this.props;
    switch (content) {
      case 'Segment': {
        const updates = {
          label: this.formRef.current.k_label.value.trim(),
          desc: this.formRef.current.k_desc.value.trim(),
          place: this.formRef.current.k_place.value
        };
        fnUpdate(element, updates);
        break;
      }
      case 'Klass': {
        const updates = {
          label: this.formRef.current.k_label.value.trim(),
          klass_prefix: this.formRef.current.k_prefix.value.trim(),
          icon_name: this.formRef.current.k_iconname.value.trim(),
          desc: this.formRef.current.k_desc.value.trim(),
          place: this.formRef.current.k_place.value
        };
        fnUpdate(element, updates);
        break;
      }
      default:
        console.log(`Warning: ${content} is not supported.`);
    }
  }

  render() {
    const {
      content, element, showModal, fnClose, fnDelete, fnActivate
    } = this.props;
    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton>
          <Modal.Title>Edit {content} attributes</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <Content ref={this.formRef} content={content} element={element} editable={false} />;
            <Form horizontal>
              <FormGroup>
                <OverlayTrigger placement="bottom" overlay={TipDelete(content)} >
                  <Button bsStyle="danger" onClick={() => fnDelete(element)}>Delete&nbsp;<i className="fa fa-trash" aria-hidden="true" /></Button>
                </OverlayTrigger>
                &nbsp;
                <OverlayTrigger placement="bottom" overlay={element.is_active === false ? TipActive(content) : TipInActive(content)} >
                  <Button
                    bsStyle={element.is_active === false ? 'success' : 'warning'}
                    onClick={() => fnActivate(element.id, element.is_active)}
                  >
                    {element.is_active === false ? 'Active' : 'Deactive'}&nbsp;
                    <i className={element.is_active === false ? 'fa fa-check' : 'fa fa-ban'} aria-hidden="true" />
                  </Button>
                </OverlayTrigger>
                &nbsp;
                <Button bsStyle="primary" onClick={() => this.handleUpdate()}>Update&nbsp;<i className="fa fa-save" aria-hidden="true" /></Button>
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

AttrEditModal.propTypes = {
  content: PropTypes.string.isRequired,
  showModal: PropTypes.bool.isRequired,
  element: PropTypes.object.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnDelete: PropTypes.func.isRequired,
  fnActivate: PropTypes.func.isRequired,
  fnUpdate: PropTypes.func.isRequired,
};
