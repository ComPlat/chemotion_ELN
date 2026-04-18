import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Row, Col, ListGroup, ListGroupItem, Button,
} from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import AppModal from 'src/components/common/AppModal';
import Utils from 'src/utilities/Functions';
import InboxActions from 'src/stores/alt/actions/InboxActions';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import Attachment from 'src/models/Attachment';
import Container from 'src/models/Container';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

function cloneDatasetContainer(datasetContainer) {
  return { ...(datasetContainer || {}) };
}

function handleAttachmentDownload(attachment) {
  Utils.downloadFile({ contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename });
}

export default function UnsortedDatasetModal({ show, datasetContainer, onHide }) {
  const [currentDatasetContainer, setCurrentDatasetContainer] = useState(
    cloneDatasetContainer(datasetContainer),
  );

  useEffect(() => {
    if (show) {
      setCurrentDatasetContainer(cloneDatasetContainer(datasetContainer));
    }
  }, [datasetContainer, show]);

  const handleFileDrop = (files) => {
    const attachments = files.map((file) => Attachment.fromFile(file));
    const firstAttach = currentDatasetContainer.attachments.length === 0;
    const nextDatasetContainer = {
      ...currentDatasetContainer,
      attachments: currentDatasetContainer.attachments.concat(attachments),
    };

    if (firstAttach) {
      const attachmentList = nextDatasetContainer.attachments;
      let attachName = attachmentList[attachmentList.length - 1].filename;
      const splitted = attachName.split('.');
      if (splitted.length > 1) {
        splitted.splice(-1, 1);
        attachName = splitted.join('.');
      }
      nextDatasetContainer.name = attachName;
    }

    setCurrentDatasetContainer(nextDatasetContainer);
  };

  const handleAttachmentRemove = (attachment) => {
    const attachmentIndex = currentDatasetContainer.attachments.indexOf(attachment);
    const nextAttachments = [...currentDatasetContainer.attachments];

    nextAttachments[attachmentIndex] = {
      ...nextAttachments[attachmentIndex],
      is_deleted: true,
    };

    setCurrentDatasetContainer({
      ...currentDatasetContainer,
      attachments: nextAttachments,
    });
  };

  const handleUndo = (attachment) => {
    const attachmentIndex = currentDatasetContainer.attachments.indexOf(attachment);
    const nextAttachments = [...currentDatasetContainer.attachments];

    nextAttachments[attachmentIndex] = {
      ...nextAttachments[attachmentIndex],
      is_deleted: false,
    };

    setCurrentDatasetContainer({
      ...currentDatasetContainer,
      attachments: nextAttachments,
    });
  };

  const handleSave = () => {
    LoadingActions.start();
    return AttachmentFetcher.uploadToInbox(
      currentDatasetContainer.attachments.filter((file) => file.is_new && !file.is_deleted),
    )().then(() => {
      onHide();
      InboxActions.fetchInboxUnsorted();
    });
  };

  const removeAttachmentButton = (attachment) => (
    <Button
      size="sm"
      variant="danger"
      onClick={() => handleAttachmentRemove(attachment)}
      className="ms-auto"
    >
      <i className="fa fa-trash-o" />
    </Button>
  );

  const renderListGroupItem = (attachment) => (
    <Row>
      <Col>
        {attachment.is_deleted ? (
          <strike>{attachment.filename}</strike>
        ) : (
          <button
            type="button"
            className="btn btn-link p-0"
            onClick={() => handleAttachmentDownload(attachment)}
          >
            {attachment.filename}
          </button>
        )}
      </Col>
      <Col className="d-flex align-items-center">
        {attachment.is_deleted ? (
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleUndo(attachment)}
            className="ms-auto"
          >
            <i className="fa fa-undo" />
          </Button>
        ) : (
          removeAttachmentButton(attachment)
        )}
      </Col>
    </Row>
  );

  const attachments = () => {
    if (!currentDatasetContainer.attachments || currentDatasetContainer.attachments.length === 0) {
      return null;
    }

    return (
      <ListGroup>
        {currentDatasetContainer.attachments.map((attachment) => (
          <ListGroupItem key={attachment.id}>
            {renderListGroupItem(attachment)}
          </ListGroupItem>
        ))}
      </ListGroup>
    );
  };

  const dropzone = () => (
    <Dropzone
      onDrop={(files) => handleFileDrop(files)}
      className="dnd-zone"
    >
      <div className="text-center p-3 text-gray-500">
        Drop Files, or Click to Select.
      </div>
    </Dropzone>
  );

  if (!show) {
    return null;
  }

  return (
    <AppModal
      title="Upload files to Inbox"
      show={show}
      size="lg"
      onHide={() => onHide()}
      closeLabel="Close"
      primaryActionLabel="Save"
      onPrimaryAction={handleSave}
    >
      <Row>
        <Col sm={12}>
          {attachments()}
          {dropzone()}
          <br />
        </Col>
      </Row>
    </AppModal>
  );
}

UnsortedDatasetModal.propTypes = {
  onHide: PropTypes.func.isRequired,
  datasetContainer: PropTypes.instanceOf(Container),
  show: PropTypes.bool.isRequired,
};
UnsortedDatasetModal.defaultProps = {
  datasetContainer: null,
};
