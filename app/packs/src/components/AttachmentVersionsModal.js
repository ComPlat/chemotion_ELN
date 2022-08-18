import React, { Component } from 'react';
import { Modal, ButtonToolbar, Button, ListGroup, ListGroupItem, Table } from 'react-bootstrap';
import AttachmentFetcher from './fetchers/AttachmentFetcher';

import Utils from './utils/Functions';

export default class AttachmentVersionsModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      data: props.data || null,
      isShow: props.isShow || false
  };

    this.datasetInput = React.createRef();
    this.handleAttachmentDownload = this.handleAttachmentDownload.bind(this);
  }

  handleAttachmentDownload(attachment) {
    Utils.downloadFile({ contents: `/api/v1/attachments/${attachment.id}?version=${attachment.version_numb}`, name: attachment.filename });
  }

  render() {
    const {
      show, data, disabled
    } = this.props;
    if (show) {
      return (
        <Modal show={show} backdrop="static" bsSize="large" dialogClassName="attachment-dataset-modal">
          <Modal.Header>
            <Modal.Title>
              Version List
              <ButtonToolbar>
                <Button bsStyle="light" onClick={this.props.onHide}>
                  <i className="fa fa-times" />
                </Button>
              </ButtonToolbar>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="list">
              <ListGroup>
                {
                  data.reverse().map((attachment) => {
                    return (
                      <ListGroupItem key={attachment.version_numb} style={{ margin: 'unset', padding: 'unset' }}>
                        <Table className="borderless" style={{ marginBottom: 'unset' }}>
                          <tbody>
                            <tr>
                              <td style={{ verticalAlign: 'middle' }}>
                                <a onClick={() => this.handleAttachmentDownload(attachment)} style={{ cursor: 'pointer' }}>{attachment.filename}</a><br />
                                <label> Version {attachment.version_numb}</label>&nbsp;&nbsp;&nbsp;
                                <label>Updated at: {attachment.updated_at}</label>
                              </td>
                            </tr>
                          </tbody>
                        </Table>
                      </ListGroupItem>
                    );
                  })
                }
              </ListGroup>
            </div>
          </Modal.Body>
        </Modal>
      );
    }
    return <div />;
  }
}
