import React from 'react';
import PropTypes from 'prop-types';
import { Row, Col, Table, ListGroup, ListGroupItem, Button, ButtonToolbar } from 'react-bootstrap';
import Dropzone from 'react-dropzone';
import Utils from '../utils/Functions';

import InboxActions from '../actions/InboxActions';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';
import Attachment from '../models/Attachment';
import Container from '../models/Container';

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
      splitted.splice(-1, 1);
      attachName = splitted.join('.');
      datasetContainer.name = attachName;
    }

    this.setState({ datasetContainer });
  }

  handleAttachmentDownload(attachment) {
    Utils.downloadFile({contents: `/api/v1/attachments/${attachment.id}`, name: attachment.filename});
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
    return AttachmentFetcher.uploadToInbox(datasetContainer.attachments
      .filter(f => f.is_new && !f.is_deleted))()
      .then(() => { onModalHide(); InboxActions.fetchInbox(); });
  }

  listGroupItem(attachment) {
    if (attachment.is_deleted) {
      return (
        <Table className="borderless">
          <tbody>
            <tr>
              <td>
                <strike>{attachment.filename}</strike>
              </td>
            </tr>
            <tr>
              <td>
                <Button
                  bsSize="xsmall"
                  bsStyle="danger"
                  onClick={() => this.handleUndo(attachment)}
                >
                  <i className="fa fa-undo" />
                </Button>
              </td>
            </tr>
          </tbody>
        </Table>
      );
    }

    return (
      <Table className="borderless">
        <tbody>
          <tr>
            <td>
              <a onClick={() => this.handleAttachmentDownload(attachment)} style={{cursor: 'pointer'}}>{attachment.filename}</a>
            </td>
          </tr>
          <tr>
            <td>
              {this.removeAttachmentButton(attachment)} &nbsp;
            </td>
          </tr>
        </tbody>
      </Table>
    );
  }

  attachments() {
    const { datasetContainer } = this.state;
    if (datasetContainer.attachments && datasetContainer.attachments.length > 0) {
      return (
        <ListGroup>
          {datasetContainer.attachments.map((attachment) => {
          return (
            <ListGroupItem key={attachment.id}>
              {this.listGroupItem(attachment)}
            </ListGroupItem>
          );
          })}
        </ListGroup>
      );
    }
    return (
      <div />
    );
  }

  removeAttachmentButton(attachment) {
    return (
      <Button bsSize="xsmall" bsStyle="danger" onClick={() => this.handleAttachmentRemove(attachment)}>
        <i className="fa fa-trash-o" />
      </Button>
    );
  }

  dropzone() {
    return (
      <Dropzone
        onDrop={files => this.handleFileDrop(files)}
        style={{ height: 50, width: '100%', border: '3px dashed lightgray' }}
      >
        <div style={{ textAlign: 'center', paddingTop: 12, color: 'gray' }}>
          Drop Files, or Click to Select.
        </div>
      </Dropzone>
    );
  }

  render() {
    const { onModalHide } = this.props;

    return (
      <Row>
        <Col md={12}>
          {this.attachments()}
          {this.dropzone()}
          <br />
        </Col>
        <Col md={12}>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => onModalHide()}>Close</Button>
            <Button
              bsStyle="warning"
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
