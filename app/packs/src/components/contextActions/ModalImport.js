import React from 'react';
import { Button, ButtonToolbar } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import UIStore from 'src/stores/alt/stores/UIStore';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';

export default class ModalImport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null
    };
  }

  handleClick() {
    const { onHide, action } = this.props;
    const { file } = this.state;
    const uiState = UIStore.getState();
    const importSampleAs = uiState.modalParams.title === 'Import Chemicals from File' ? 'chemical' : 'sample';
    const params = {
      file,
      currentCollectionId: uiState.currentCollection.id,
      type: importSampleAs
    };
    action(params);
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
        <div>
          {file.name}
          <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove()} className="pull-right">
            <i className="fa fa-trash-o"></i>
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
    const { onHide } = this.props;
    return (
      <div>
        {this.dropzoneOrfilePreview()}
        &nbsp;
        <ButtonToolbar>
          <Button bsStyle="primary" onClick={() => onHide()}>Cancel</Button>
          <Button bsStyle="warning" onClick={() => this.handleClick()} disabled={this.isDisabled()}>Import</Button>
        </ButtonToolbar>
      </div>
    );
  }
}
