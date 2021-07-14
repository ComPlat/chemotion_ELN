import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

import AttachmentContainer from './AttachmentContainer';
import DragDropItemTypes from '../DragDropItemTypes';

import Container from '../models/Container';
import UnsortedDatasetModal from './UnsortedDatasetModal';

export default class UnsortedBox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      modal: {
        show: false,
        datasetContainer: null
      }
    };
  }

  handleFileModalOpen(datasetContainer) {
    const { modal } = this.state;
    modal.datasetContainer = datasetContainer;
    modal.show = true;
    this.setState({ modal });
  }

  handleFileModalHide() {
    const { modal } = this.state;
    modal.datasetContainer = null;
    modal.show = false;
    this.setState({ modal });
    document.body.className = document.body.className.replace('modal-open', '');
  }

  handleUploadButton() {
    const datasetContainer = Container.buildEmpty();
    datasetContainer.container_type = 'dataset';
    this.handleFileModalOpen(datasetContainer);
  }

  render() {
    const { unsorted_box, largerInbox } = this.props;
    const { visible, modal } = this.state;

    const attachments = visible ? unsorted_box.map((attachment) => {
      return (
        <AttachmentContainer
          key={`attach_${attachment.id}`}
          sourceType={DragDropItemTypes.UNLINKED_DATA}
          attachment={attachment}
          largerInbox={largerInbox}
        />
      );
    })
      :
    <div />;

    const folderClass = `fa fa-folder${visible ? '-open' : ''}`;

    const uploadModal = (
      <UnsortedDatasetModal
        onHide={() => this.handleFileModalHide()}
        show={modal.show}
        datasetContainer={modal.datasetContainer}
      />
    );

    const uploadButton = (
      <Button style={{ position: 'absolute', right: 0 }} bsSize="xsmall" onClick={() => this.handleUploadButton()}>
        <i className="fa fa-upload" aria-hidden="true" />
      </Button>
    );

    return (
      <div className="tree-view">
        <div className="title">
          <i
            className={folderClass}
            aria-hidden="true"
            onClick={() => this.setState({ visible: !visible })}
          > Unsorted
          </i>
          {' '}
          {uploadButton}
        </div>
        <div> {attachments} </div>
        {uploadModal}
      </div>
    );
  }
}

UnsortedBox.propTypes = {
  unsorted_box: PropTypes.array.isRequired,
  largerInbox: PropTypes.bool
};

UnsortedBox.defaultProps = {
  largerInbox: false
};
