import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import AppModal from 'src/components/common/AppModal';

import { StoreContext } from 'src/stores/mobx/RootStore';

class ModalImportCollection extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      file: null,
      processing: false,
    };
  }

  handleClick() {
    const { onHide } = this.props;
    const { file } = this.state;
    const { collections } = this.context;
    this.setState({ processing: true });
    const params = {
      file,
    };

    collections.importCollections(params);
    setTimeout(() => {
      this.setState({ processing: false });
      onHide();
    }, 1800);
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
    }

    return (
      <Dropzone
        onDrop={(attachmentFile) => this.handleFileDrop(attachmentFile)}
        style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
      >
        <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
          Drop File, or Click to Select.
        </div>
      </Dropzone>
    );
  }

  isDisabled() {
    const { file, processing } = this.state;
    return file == null || processing === true;
  }

  render() {
    const { onHide } = this.props;
    const { processing } = this.state;
    const bTitle = processing === true ? 'Importing' : 'Import';

    return (
      <AppModal
        show
        onHide={onHide}
        title="Import Collections from ZIP archive"
        primaryActionLabel={bTitle}
        onPrimaryAction={() => this.handleClick()}
        primaryActionDisabled={this.isDisabled()}
      >
        {this.dropzoneOrfilePreview()}
      </AppModal>
    );
  }
}

ModalImportCollection.contextType = StoreContext;

export default ModalImportCollection;

ModalImportCollection.propTypes = {
  onHide: PropTypes.func.isRequired,
};
