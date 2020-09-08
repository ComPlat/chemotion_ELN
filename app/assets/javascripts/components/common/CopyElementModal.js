import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import uuid from 'uuid';

import ClipboardActions from '../actions/ClipboardActions';
import CollectionSelect from './CollectionSelect';
import NotificationActions from '../actions/NotificationActions';
import ElementActions from '../actions/ElementActions';

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

  componentDidMount() {
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

    if (element.type == 'sample') {
      ClipboardActions.fetchElementAndBuildCopy(element, selectedCol, 'copy_sample');
    } else if (element.type == 'reaction') {
      ElementActions.copyReaction(element, selectedCol);
    }

    this.setState({ showModal: false });
    return true;
  }

  render() {
    const { element } = this.props;
    const { showModal, selectedCol } = this.state;
    const canCopy = element.can_copy ? '' : 'none';

    return (
      <span>
        <OverlayTrigger
          placement="bottom"
          overlay={<Tooltip id="CopyElement">Copy</Tooltip>}>
          <Button id="copy-element-btn" style={{ marginLeft: '5px', display: `${canCopy}` }} bsSize="xsmall" className="button-right" bsStyle="success" onClick={this.handleModalShow}>
            <i className="fa fa-clone" />
          </Button>
        </OverlayTrigger>
        <Modal show={showModal} onHide={this.handleModalClose}>
          <Modal.Header closeButton>
            <Modal.Title>Copy</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <span className="select-collection">
              <b>Copy to Collection</b>
              <span className="select-component">
                <CollectionSelect
                  value={selectedCol}
                  onChange={this.onColSelectChange}
                />
              </span>
            </span>
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={this.handleModalClose} className="pull-left">Close</Button>
            <Button id="submit-copy-element-btn" bsStyle="success" onClick={this.copyElement} className="pull-left">Copy</Button>
          </Modal.Footer>
        </Modal>
      </span>
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