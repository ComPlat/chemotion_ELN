import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Modal, Button } from 'react-bootstrap';
import LayerAttrForm from './LayerAttrForm';

export default class LayerAttrNewModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
  }

  handleCreate() {
    const { fnCreate } = this.props;
    const layer = {
      key: this.formRef.current.lf_layerKey.value.trim(),
      label: this.formRef.current.lf_label.value.trim(),
      cols: parseInt(this.formRef.current.lf_cols.value.trim() || 1, 10),
      position: parseInt(this.formRef.current.lf_position.value.trim() || 100, 10),
      condition: this.formRef.current.lf_condition.value.trim()
    };
    fnCreate(layer);
  }

  render() {
    const { showModal, fnClose } = this.props;
    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>New Layer</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <LayerAttrForm ref={this.formRef} layer={{}} isKlassReadonly={false} />
            <FormGroup>
              <Button bsStyle="primary" onClick={() => this.handleCreate()}>Add new layer to template workspace&nbsp;<i className="fa fa-archive" aria-hidden="true" /></Button>
              &nbsp;
              <Button bsStyle="warning" onClick={() => fnClose()}>Cancel</Button>
            </FormGroup>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

LayerAttrNewModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnCreate: PropTypes.func.isRequired,
};
