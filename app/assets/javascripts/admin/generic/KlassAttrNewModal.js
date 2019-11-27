import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Modal, Button } from 'react-bootstrap';
import KlassAttrForm from './KlassAttrForm';

export default class KlassAttrNewModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
  }

  handleCreate() {
    const { fnCreate } = this.props;
    const element = {
      name: this.formRef.current.k_name.value.trim(),
      label: this.formRef.current.k_label.value.trim(),
      icon_name: this.formRef.current.k_iconname.value.trim(),
      desc: this.formRef.current.k_desc.value.trim()
    };
    fnCreate(element);
  }

  render() {
    const { showModal, fnClose } = this.props;
    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>New Klass</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <KlassAttrForm ref={this.formRef} element={{}} isKlassReadonly={false} />
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

KlassAttrNewModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnCreate: PropTypes.func.isRequired,
};
