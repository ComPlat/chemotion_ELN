import React from 'react';
import PropTypes from 'prop-types';
import {
  Form, Modal, Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import uuid from 'uuid';

import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import CollectionSelect from 'src/components/common/CollectionSelect';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import UIStore from 'src/stores/alt/stores/UIStore';

const Notification = (props) => (
  NotificationActions.add({
    title: props.title,
    message: props.msg,
    level: props.lvl,
    position: 'tc',
    dismissible: 'button',
    uid: uuid.v4()
  })
);

export default class CopyElementModal extends React.Component {
  constructor(props) {
    super(props);

    // Determine default collection ID
    const { currentCollection } = UIStore.getState();
    const defCol = currentCollection && currentCollection.is_shared === false
      && currentCollection.is_locked === false && currentCollection.label !== 'All' 
      ? currentCollection.id : null;

    this.state = {
      showModal: false,
      selectedCol: defCol,
      showAmountsConfirm: false
    };
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
    this.onColSelectChange = this.onColSelectChange.bind(this);
    this.copyElement = this.copyElement.bind(this);
    this.handleAmountsConfirm = this.handleAmountsConfirm.bind(this);
    this.handleAmountsConfirmClose = this.handleAmountsConfirmClose.bind(this);
  }

  handleModalShow() {
    this.setState({ showModal: true });
  }

  handleModalClose() {
    this.setState({ showModal: false });
  }

  handleAmountsConfirm(keepAmounts) {
    const { selectedCol } = this.state;
    const { element } = this.props;
    this.setState({ showAmountsConfirm: false });
    ElementActions.copyReaction(element, selectedCol, keepAmounts);
  }

  handleAmountsConfirmClose() {
    this.setState({ showAmountsConfirm: false });
  }

  onColSelectChange(e) {
    this.setState({ selectedCol: e });
  }

  copyElement() {
    const { selectedCol } = this.state;
    const { element } = this.props;
    if (selectedCol == null) {
      Notification({ title: 'Collection can not be empty', lvl: 'error', msg: 'Collection can not be empty' });
      return false;
    }

    if (element.type === 'sample') {
      ClipboardActions.fetchElementAndBuildCopy(element, selectedCol, 'copy_sample');
    } else if (element.type === 'reaction') {
      // Show amounts confirmation modal instead of proceeding directly
      this.setState({ showModal: false, showAmountsConfirm: true });
      return true;
    } else if (element.type === 'research_plan') {
      ElementActions.copyResearchPlan(element, selectedCol);
    } else if (element.type === 'device_description') {
      ClipboardActions.fetchDeviceDescriptionAndBuildCopy(element, selectedCol);
    } else if (element.type === 'sequence_based_macromolecule_sample') {
      ClipboardActions.fetchSequenceBasedMacromoleculeSamplesAndBuildCopy(element, selectedCol);
    } else {
      ElementActions.copyElement(element, selectedCol);
    }

    this.setState({ showModal: false });
    return true;
  }

  render() {
    const { element } = this.props;
    const { showModal, selectedCol, showAmountsConfirm } = this.state;

    // Don't render if element can't be copied or is new
    if (!element.can_copy || element.isNew) return null;

    return (
      <>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="CopyElement">Copy</Tooltip>}
        >
          <Button id="copy-element-btn" size="xxsm" variant="success" onClick={this.handleModalShow}>
            <i className="fa fa-clone" />
          </Button>
        </OverlayTrigger>

        <Modal centered show={showModal} onHide={this.handleModalClose}>
          <Modal.Header closeButton>
            <Modal.Title>Copy</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Label>Copy to Collection</Form.Label>
            <CollectionSelect
              value={selectedCol}
              onChange={this.onColSelectChange}
            />
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={this.handleModalClose}>Close</Button>
            <Button id="submit-copy-element-btn" variant="success" onClick={this.copyElement}>Copy</Button>
          </Modal.Footer>
        </Modal>

        <Modal centered animation={false} show={showAmountsConfirm} onHide={this.handleAmountsConfirmClose}>
          <Modal.Header closeButton>
            <Modal.Title>Copy Reaction</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Do you also want to copy the
            <strong> real amounts </strong>
            of the reaction materials (excluding product materials)?
            <br />
            <br />
            <strong>Note: </strong>
            Target amounts of the starting and reactant materials will be copied by default.
            The amounts (real and target) of the product materials can not be copied.
            <br />
          </Modal.Body>
          <Modal.Footer className="border-0">
            <OverlayTrigger
              placement="bottom"
              overlay={(
                <Tooltip id="copy-modal-yes-tooltip">
                  Real amounts of starting materials, reactants, and solvents will be preserved
                </Tooltip>
              )}
            >
              <Button className="w-100 btn btn-info" onClick={() => this.handleAmountsConfirm(true)}>
                Yes - copy target and real amounts
              </Button>
            </OverlayTrigger>

            <OverlayTrigger
              placement="bottom"
              overlay={(
                <Tooltip id="copy-modal-no-tooltip">
                  Only target amounts will be copied, real amounts will be cleared
                </Tooltip>
              )}
            >
              <Button className="w-100 btn btn-info" onClick={() => this.handleAmountsConfirm(false)}>
                No - only copy the target amounts
              </Button>
            </OverlayTrigger>
          </Modal.Footer>
        </Modal>
      </>
    );
  }
}

CopyElementModal.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired
};
