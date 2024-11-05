import React from 'react';
import PropTypes from 'prop-types';
import { Button, ButtonToolbar, Modal } from 'react-bootstrap';
import Dropzone from 'react-dropzone';

import CollectionActions from 'src/stores/alt/actions/CollectionActions';

export default class ModalImportCollection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
      processing: false
    };
  }

  handleClick() {
    const { onHide } = this.props;
    const { file } = this.state;
    this.setState({ processing: true });
    let params = {
      file: file
    }
    CollectionActions.importCollectionsFromFile(params);
    setTimeout(() => {
      this.setState({ processing: false });
      onHide();
    }, 1800);
  }

  handleFileDrop(attachment_file) {
    this.setState({ file: attachment_file[0] });
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
    const { file, processing } = this.state;
    return file == null || processing === true;
  }

  render() {
    const { onHide } = this.props;
    const { processing } = this.state;
    const bStyle = processing === true ? 'danger' : 'warning';
    const bClass = processing === true ? 'fa fa-spinner fa-pulse fa-fw' : 'fa fa-file-text-o';
    const bTitle = processing === true ? 'Importing' : 'Import';

    return (
      <Modal show onHide={onHide}>
        <Modal.Header closeButton>
          <Modal.Title>Import Collections from ZIP archive</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.dropzoneOrfilePreview()}
          <ButtonToolbar className="mt-2 justify-content-end gap-1">
            <Button variant="primary" onClick={() => onHide()}>Cancel</Button>
            <Button variant={bStyle} onClick={() => this.handleClick()} disabled={this.isDisabled()}>
              <i className={bClass} />
              {' '}
              {bTitle}
            </Button>
          </ButtonToolbar>
        </Modal.Body>
      </Modal>
    )
  }
}

ModalImportCollection.propTypes = {
  onHide: PropTypes.func.isRequired,
}
