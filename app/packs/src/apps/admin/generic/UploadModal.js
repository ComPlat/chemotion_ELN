import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import { Modal } from 'react-bootstrap';

export default class UploadModal extends Component {
  constructor(props) {
    super(props);
    this.formRef = React.createRef();
    this.handleUploadTemplate = this.handleUploadTemplate.bind(this);
  }


  handleReaderLoaded(e) {
    const reader = e.target;
    const pt = reader.result;
    let properties = {};
    let isVaild = true;
    let message = '';

    try {
      properties = JSON.parse(pt);
    } catch (err) {
      isVaild = false;
      message = `Error Format:${err}`;
    }

    if (isVaild && properties.klass !== this.props.klass) {
      isVaild = false;
      message = `Error, the template is from [${properties.klass}]` ;
    }

    if (isVaild) {
      this.props.fnUpload(properties);
    } else {
      this.props.fnUpload(null, message, false);
    }
  }

  handleUploadTemplate(file) {
    const reader = new FileReader();
    reader.onload = this.handleReaderLoaded.bind(this);
    reader.readAsText(file[0]);
  }

  render() {
    const { content, showModal, fnClose } = this.props;
    return (
      <Modal show={showModal} onHide={() => fnClose()}>
        <Modal.Header closeButton><Modal.Title>{`Upload ${content} Templates`}</Modal.Title></Modal.Header>
        <Modal.Body style={{ overflow: 'auto' }}>
          <Dropzone
            onDrop={attach => this.handleUploadTemplate(attach)}
            style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}>
            <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
              Drop File, or Click to Select.
            </div>
          </Dropzone>
        </Modal.Body>
      </Modal>
    );
  }
}

UploadModal.propTypes = {
  content: PropTypes.string.isRequired,
  showModal: PropTypes.bool.isRequired,
  fnClose: PropTypes.func.isRequired,
  fnUpload: PropTypes.func.isRequired,
};
