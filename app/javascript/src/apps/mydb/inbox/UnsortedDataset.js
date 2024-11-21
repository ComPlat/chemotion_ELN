import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, ListGroup, ListGroupItem, Button, ButtonToolbar } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import Utils from 'src/utilities/Functions';

import InboxActions from 'src/stores/alt/actions/InboxActions';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import Attachment from 'src/models/Attachment';
import Container from 'src/models/Container';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';

export default class UnsortedDataset extends React.Component {
  constructor(props) {
    super();
    const datasetContainer = Object.assign({}, props.datasetContainer);
    this.state = {
      datasetContainer
    };
  }

  handleFileDrop(files) {
    const { datasetContainer } = this.state;

    const attachments = files.map(f => Attachment.fromFile(f));
    const firstAttach = datasetContainer.attachments.length === 0;
    datasetContainer.attachments = datasetContainer.attachments.concat(attachments);

    if (firstAttach) {
      const attachmentList = datasetContainer.attachments;
      let attachName = attachmentList[attachmentList.length - 1].filename;
      const splitted = attachName.split('.');
      if (splitted.length > 1) {
        splitted.splice(-1, 1);
        attachName = splitted.join('.');
      }
      datasetContainer.name = attachName;
    }

    this.setState({ datasetContainer });
  }

  handleAttachmentDownload(attachment) {
    Utils.downloadFile({ contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename });
  }

  handleAttachmentRemove(attachment) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);

    datasetContainer.attachments[index].is_deleted = true;
    this.setState({ datasetContainer });
  }

  handleUndo(attachment) {
    const { datasetContainer } = this.state;
    const index = datasetContainer.attachments.indexOf(attachment);

    datasetContainer.attachments[index].is_deleted = false;
    this.setState({ datasetContainer });
  }

  handleSave() {
    const { datasetContainer } = this.state;
    const { onModalHide } = this.props;
    LoadingActions.start();
    return AttachmentFetcher.uploadToInbox(datasetContainer.attachments
      .filter(f => f.is_new && !f.is_deleted))()
      .then(() => { onModalHide(); InboxActions.fetchInboxUnsorted(); });
  }

  listGroupItem(attachment) {
    return (
      <Row>
        <Col>
          {attachment.is_deleted ? (
            <strike>{attachment.filename}</strike>
          ) : (
            <a
              onClick={() => this.handleAttachmentDownload(attachment)}
              role="button">
              {attachment.filename}
            </a>
          )}
        </Col>
        <Col className="d-flex align-items-center">
          {attachment.is_deleted ? (
            <Button
              size="sm"
              variant="danger"
              onClick={() => this.handleUndo(attachment)}
              className="ms-auto"
            >
              <i className="fa fa-undo" />
            </Button>
          ) : (
            this.removeAttachmentButton(attachment)
          )}
        </Col>
      </Row>
    );
  }

  attachments() {
    const { datasetContainer } = this.state;

    if (!datasetContainer.attachments || datasetContainer.attachments.length === 0) {
      return null;
    }

    return (
      <ListGroup>
        {datasetContainer.attachments.map((attachment) => (
          <ListGroupItem key={attachment.id}>
            {this.listGroupItem(attachment)}
          </ListGroupItem>
        ))}
      </ListGroup>
    );
  }

  removeAttachmentButton(attachment) {
    return (
      <Button
        size="sm"
        variant="danger"
        onClick={() => this.handleAttachmentRemove(attachment)}
        className="ms-auto"
      >
        <i className="fa fa-trash-o" />
      </Button>
    );
  }

  dropzone() {
    return (
      <Dropzone
        onDrop={(files) => this.handleFileDrop(files)}
        className="dnd-zone">
        <div className="text-center p-3 text-gray-500">
          Drop Files, or Click to Select.
        </div>
      </Dropzone>
    );
  }

  render() {
    const { onModalHide } = this.props;

    return (
      <Row>
        <Col sm={12}>
          {this.attachments()}
          {this.dropzone()}
          <br />
        </Col>
        <Col md={12}>
          <ButtonToolbar className="gap-1 justify-content-end">
            <Button variant="primary" onClick={() => onModalHide()}>Close</Button>
            <Button
              variant="warning"
              onClick={() => this.handleSave()}
            >
              Save
            </Button>
          </ButtonToolbar>
        </Col>
      </Row>
    );
  }
}

UnsortedDataset.propTypes = {
  onModalHide: PropTypes.func.isRequired,
  datasetContainer: PropTypes.instanceOf(Container),
};

UnsortedDataset.defaultProps = {
  datasetContainer: null,
};
