import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Modal } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import UIStore from 'src/stores/alt/stores/UIStore';

import ElementActions from 'src/stores/alt/actions/ElementActions';
import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class ModalImport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null
    };
  }

  handleClick() {
    const { onHide, importAsChemical } = this.props;
    const { file } = this.state;
    const uiState = UIStore.getState();
    const params = {
      file,
      currentCollectionId: uiState.currentCollection.id,
      type: importAsChemical ? 'chemical' : 'sample',
    };
    ElementActions.importSamplesFromFile(params);
    onHide();

    const notification = {
      title: 'Uploading',
      message: 'The file is being processed. Please wait...',
      level: 'warning',
      dismissible: false,
      uid: 'import_samples_upload',
      position: 'bl'
    };

    NotificationActions.add(notification);
  }

  handleFileDrop(attachmentFile) {
    this.setState({ file: attachmentFile[0] });
  }

  handleAttachmentRemove() {
    this.setState({ file: null });
  }

  dropzoneOrfilePreview() {
    const { file } = this.state;
    if (file) {
      return (
        <div className="d-flex justify-content-between">
          {file.name}
          <Button size="sm" variant="danger" onClick={() => this.handleAttachmentRemove()}>
            <i className="fa fa-trash-o" />
          </Button>
        </div>
      );
    } else {
      return (
        <Dropzone
          onDrop={attachment_file => this.handleFileDrop(attachment_file)}
          style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
        >
          <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
            Drop File, or Click to Select.
          </div>
        </Dropzone>
      );
    }
  }

  isDisabled() {
    const { file } = this.state;
    return file == null;
  }

  render() {
    const { onHide, importAsChemical } = this.props;
    return (
      <Modal show onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>
            {importAsChemical
              ? 'Import Chemicals from File'
              : 'Import Samples from File'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.dropzoneOrfilePreview()}
          <ButtonToolbar className="justify-content-end mt-2 gap-1">
            <Button variant="primary" onClick={() => onHide()}>Cancel</Button>
            <Button variant="warning" onClick={() => this.handleClick()} disabled={this.isDisabled()}>Import</Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    );
  }
}

ModalImport.propTypes = {
  importAsChemical: PropTypes.bool,
  onHide: PropTypes.func.isRequired,
}

ModalImport.defaultProps = {
  importAsChemical: false,
}
