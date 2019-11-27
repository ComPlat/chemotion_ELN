import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Modal, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import KlassAttrForm from './KlassAttrForm';

const klassActiveTooltip = <Tooltip id="active_button">This klass is deactivated, press button to [activate]</Tooltip>;
const klassInActiveTooltip = <Tooltip id="disable_button">This klass is activated, press button to [deactivate]</Tooltip>;
const klassDeleteTooltip = <Tooltip id="delete_button">Delete this Klass, after deletion, all elements are unaccessible</Tooltip>;

export default class KlassAttrEditModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
  }

  handleUpdate() {
    const { element, fnUpdate } = this.props;
    const updates = {
      label: this.formRef.current.k_label.value.trim(),
      icon_name: this.formRef.current.k_iconname.value.trim(),
      desc: this.formRef.current.k_desc.value.trim()
    };
    fnUpdate(element, updates);
  }

  render() {
    const {
      element, showModal, fnClose, fnDelete, fnActivate
    } = this.props;
    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>Edit Klass attributes</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <div className="col-md-12">
            <KlassAttrForm ref={this.formRef} element={element} isKlassReadonly />
            <Form horizontal>
              <FormGroup>
                <OverlayTrigger placement="bottom" overlay={klassDeleteTooltip} >
                  <Button bsStyle="danger" onClick={() => fnDelete(element)}>Delete&nbsp;<i className="fa fa-trash" aria-hidden="true" /></Button>
                </OverlayTrigger>
                &nbsp;
                <OverlayTrigger placement="bottom" overlay={element.is_active === false ? klassActiveTooltip : klassInActiveTooltip} >
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

KlassAttrEditModal.propTypes = {
  showModal: PropTypes.bool.isRequired,
  element: PropTypes.object.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnDelete: PropTypes.func.isRequired,
  fnActivate: PropTypes.func.isRequired,
  fnUpdate: PropTypes.func.isRequired,
};
