import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { Modal } from 'react-bootstrap';

export default class ProfileNewModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
    this.handleUploadTemplate = this.handleUploadTemplate.bind(this);
  }

  handleUploadTemplate(file) {
    this.props.fnCreate(file[0]);
  }

  render() {
    const { content, showModal, fnClose } = this.props;
    return (
      <Modal backdrop="static" show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>{`New ${content}`}</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <Dropzone
            onDrop={attach => this.handleUploadTemplate(attach)}
            style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
          >
            <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>Drop File, or Click to Select.</div>
          </Dropzone>
        </Modal.Body>
      </Modal>
    );
  }
}

ProfileNewModal.propTypes = {
  content: PropTypes.string.isRequired,
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnCreate: PropTypes.func.isRequired,
};
