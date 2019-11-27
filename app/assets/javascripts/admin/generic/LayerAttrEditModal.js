import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, Modal, Button } from 'react-bootstrap';
import LayerAttrForm from './LayerAttrForm';

export default class LayerAttrEditModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
  }

  handleUpdate() {
    const { layer, fnUpdate } = this.props;
    const updates = {
      label: this.formRef.current.lf_label.value.trim(),
      cols: parseInt(this.formRef.current.lf_cols.value.trim() || 1, 10),
      position: parseInt(this.formRef.current.lf_position.value.trim() || 100, 10),
      condition: this.formRef.current.lf_condition.value.trim()
    };
    fnUpdate(layer.key, updates);
  }

  render() {
    const { showModal, fnClose, layer } = this.props;
    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>Edit Layer attributes</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <LayerAttrForm ref={this.formRef} layer={layer} />
            <FormGroup>
              <Button bsStyle="primary" onClick={() => this.handleUpdate()}>Update layer to template workspace&nbsp;<i className="fa fa-archive" aria-hidden="true" /></Button>
              &nbsp;
              <Button bsStyle="warning" onClick={() => fnClose()}>Cancel</Button>
            </FormGroup>
          </div>
        </Modal.Body>
      </Modal>
    );
  }
}

LayerAttrEditModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnUpdate: PropTypes.func.isRequired,
  layer: PropTypes.object.isRequired,
};
