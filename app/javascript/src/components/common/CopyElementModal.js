import React from 'react';
import PropTypes from 'prop-types';
import { Form, Modal, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';

import ClipboardActions from 'src/stores/alt/actions/ClipboardActions';
import CollectionSelect from 'src/components/common/CollectionSelect';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';

const Notification = props =>
(
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
    this.state = {
      showModal: false,
      selectedCol: props.defCol
    };
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
    this.onColSelectChange = this.onColSelectChange.bind(this);
    this.copyElement = this.copyElement.bind(this);
  }

  onColSelectChange(e) {
    this.setState({ selectedCol: e });
  }

  handleModalShow(e) {
    this.setState({ showModal: true });
  }

  handleModalClose(e) {
    this.setState({ showModal: false });
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
      ElementActions.copyReaction(element, selectedCol);
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
    const { showModal, selectedCol } = this.state;

    if (!element.can_copy) return null;

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
      </>
    );
  }
}

CopyElementModal.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  element: PropTypes.object.isRequired,
  defCol: PropTypes.number
};


CopyElementModal.defaultProps = {
  defCol: null
};
