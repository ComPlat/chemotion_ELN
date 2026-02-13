/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Modal, Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { stopEvent } from 'src/utilities/DomHelper';
import { fetchImageSrcByAttachmentId } from 'src/utilities/imageHelper';

export default class ImageModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fetchSrc: '',
      showModal: false,
      isPdf: false,
      thumbnail: ''
    };

    this.fetchImage = this.fetchImage.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
    this.handleImageError = this.handleImageError.bind(this);
    this.fetchImageThumbnail = this.fetchImageThumbnail.bind(this);
  }

  componentDidMount() {
    this.fetchImageThumbnail();
  }

  componentDidUpdate(prevProps) {
    if (this.props.attachment?.id !== prevProps.attachment?.id) {
      this.fetchImageThumbnail();
    }
  }

  handleModalClose(e) {
    stopEvent(e);
    this.setState({ showModal: false });
  }

  handleModalShow(e) {
    stopEvent(e);
    this.fetchImage();
    this.setState({ showModal: true });
  }

  handleImageError() {
    this.setState({ fetchSrc: '/images/wild_card/not_available.svg' });
  }

  fetchImage() {
    try {
      const { attachment } = this.props;
      if (!attachment) throw new Error('Attachment is not provided');
      AttachmentFetcher.fetchImageAttachment({ id: attachment.id }).then(
        (result) => {
          if (!result?.data) throw new Error('Attachment is not provided');
          this.setState({ fetchSrc: result.data, isPdf: result.type === 'application/pdf' });
        }
      );
    } catch (error) {
      this.handleImageError();
    }
  }

  async fetchImageThumbnail() {
    const { attachment } = this.props;
    const fileType = attachment?.file?.type;
    const isImage = fileType?.startsWith('image/');
    const defaultNoAttachment = '/images/wild_card/no_attachment.svg';
    const defaultUnavailable = '/images/wild_card/not_available.svg';

    // For unsaved/pending attachments we must use the local preview (there is no server thumbnail yet).
    if (attachment?.is_new || attachment?.is_pending) {
      const previewSrc = isImage ? attachment?.file?.preview : defaultUnavailable;
      this.setState({ thumbnail: previewSrc });
    } else if (attachment?.thumb) {
      const src = await fetchImageSrcByAttachmentId(attachment.id);
      this.setState({ thumbnail: src });
    } else {
      this.setState({ thumbnail: defaultNoAttachment });
    }
  }

  showPopObject() {
    const { thumbnail } = this.state;
    const { attachment } = this.props;

    return (
      <Tooltip id="popObject" className="large-preview-modal">
        <img src={thumbnail} alt={attachment?.filename} />
      </Tooltip>
    );
  }

  render() {
    const {
      popObject, attachment, placement = 'right'
    } = this.props;
    const {
      isPdf, fetchSrc, thumbnail
    } = this.state;

    return (
      <div>
        <div
          className="preview-table"
          onClick={this.handleModalShow}
          onKeyPress={this.handleModalShow}
          role="button"
          tabIndex={0}
        >
          <OverlayTrigger
            placement={placement}
            overlay={this.showPopObject()}
          >
            <img
              src={thumbnail}
              alt={attachment?.filename}
            />
          </OverlayTrigger>
        </div>
        <Modal
          centered
          show={this.state.showModal}
          onHide={this.handleModalClose}
          dialogClassName="noticeModal"
          size="xxxl"
        >
          <Modal.Header closeButton>
            <Modal.Title>{popObject.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto', position: 'relative', minHeight: '400px' }}>
            {isPdf && fetchSrc ? (
              <iframe
                src={fetchSrc}
                width="100%"
                height="600px"
                style={{ border: 'none' }}
                title="PDF Viewer"
              >
                <p>
                  Your browser does not support PDFs.
                  <a href={fetchSrc} target="_blank" rel="noopener noreferrer">
                    Download the PDF
                  </a>
                </p>
              </iframe>
            ) : (
              <img
                src={fetchSrc}
                style={{
                  display: 'block',
                  maxHeight: '80vh',
                  maxWidth: '100%',
                  margin: '0 auto'
                }}
                alt={attachment?.filename}
                onError={this.handleImageError}
              />
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={this.handleModalClose} className="pull-left">
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  }
}

ImageModal.propTypes = {
  attachment: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    filename: PropTypes.string,
    thumb: PropTypes.bool,
    identifier: PropTypes.string,
    is_new: PropTypes.bool,
    is_pending: PropTypes.bool,
    file: PropTypes.shape({
      type: PropTypes.string,
      preview: PropTypes.string,
    })
  }).isRequired,
  popObject: PropTypes.shape({
    title: PropTypes.string,
  }).isRequired,
  placement: PropTypes.string,
};
