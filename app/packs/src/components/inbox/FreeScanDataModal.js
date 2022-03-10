import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Row, Col } from 'react-bootstrap';
import Container from '../models/Container';
import ReactJson from 'react-json-view';
import Utils from '../utils/Functions';

const handleAttachmentDownload = attachment => Utils.downloadFile({
  contents: `/api/v1/attachments/${attachment && attachment.id}`, name: attachment && attachment.filename
});

export default class FreeScanDataModal extends React.Component {
  render() {
    const {show, attachment, onHide} = this.props;
    if(show) {
      return (
        <div>
          <Modal animation show={show} bsSize="large" onHide={() => onHide()}>
            <Modal.Header closeButton>
              <Modal.Title>
                Free Scan Data
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Row>
                <Col sm={2} md={2} lg={2}>Attachment: </Col>
                <Col sm={10} md={10} lg={10}><a onClick={() => handleAttachmentDownload(attachment)}>{attachment.filename}</a></Col>
              </Row>
              <Row>
                <Col sm={2} md={2} lg={2}>Scan Data: </Col>
                <Col sm={10} md={10} lg={10}><ReactJson src={JSON.parse(attachment.scan_data)} /></Col>
              </Row>
              
            </Modal.Body>
          </Modal>
        </div>
      )
    } else {
      return <div></div>
    }
  }
}

FreeScanDataModal.propTypes = {
  onHide: PropTypes.func.isRequired,
  attachment: PropTypes.instanceOf(Container),
  show: PropTypes.bool.isRequired,
};

FreeScanDataModal.defaultProps = {
  attachment: null,
};
