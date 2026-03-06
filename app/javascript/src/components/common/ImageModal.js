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
      pageIndex: 1,
      numOfPages: 0,
      thumbnail: '',
      thumbnails: [],
      currentPreferredThumbnail: Number(props.preferredThumbnail) || null,
      thumbPage: 0,
      isLoading: false,
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
    const { attachment, ChildrenAttachmentsIds, preferredThumbnail } = this.props;
    const prevIds = prevProps.ChildrenAttachmentsIds || [];
    const currIds = ChildrenAttachmentsIds || [];
    // Attachment changed - refetch thumbnail
    if (attachment?.id !== prevProps.attachment?.id) {
      this.fetchImageThumbnail();
    }
    // Preferred thumbnail prop changed - sync state and refetch
    if (preferredThumbnail !== prevProps.preferredThumbnail) {
      this.setState({
        currentPreferredThumbnail: preferredThumbnail ? Number(preferredThumbnail) : null
      });
      this.fetchImageThumbnail();
    }
    // ChildrenAttachmentsIds changed (attachment added/deleted) - refresh thumbnails
    if (prevIds.length !== currIds.length || !prevIds.every((id, i) => id === currIds[i])) {
      this.fetchThumbnails();
      // If current preferred thumbnail is no longer in the list, clear it from state
      const { currentPreferredThumbnail } = this.state;
      if (currentPreferredThumbnail && !currIds.includes(currentPreferredThumbnail)) {
        // Parent will handle reassigning; clear local state
        this.setState({ currentPreferredThumbnail: null });
        this.fetchImageThumbnail();
      }
    }
  }

  // Check if src is a valid displayable image source
  isValidImageSrc(src) {
    return typeof src === 'string'
      && src.length > 0
      && !src.includes('[object Object]');
  }

  // keyboard handler extracted from inline render for thumbnails
  handleThumbKeyDown = (e, thumb) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleSetPreferred(thumb);
    }
  };

  handleModalClose(e) {
    stopEvent(e);
    this.setState({ showModal: false });
  }

  handleModalShow(e) {
    if (!this.props.disableClick) {
      stopEvent(e);
      // Sync currentPreferredThumbnail with prop when modal opens
      const { preferredThumbnail } = this.props;
      this.setState({
        showModal: true,
        currentPreferredThumbnail: preferredThumbnail ? Number(preferredThumbnail) : null,
      });
      this.fetchImage();
      this.fetchThumbnails();
    }
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

  buildImageSrcArrayFromThumbnails(thumbnails) {
    if (thumbnails && thumbnails.length > 0) {
      return thumbnails.map(({ id, thumbnail }) => {
        const src = (typeof thumbnail === 'string' && thumbnail.length > 0)
          ? `data:image/png;base64,${thumbnail}`
          : null;
        return { id, thumbnail: src };
      });
    }
    return [];
  }

  fetchThumbnails() {
    const { ChildrenAttachmentsIds } = this.props;
    // Filter to ensure only valid numeric IDs are sent to the API
    const validIds = (ChildrenAttachmentsIds || []).filter(
      (id) => typeof id === 'number' && !Number.isNaN(id) && id > 0
    );
    if (validIds.length > 0) {
      AttachmentFetcher.fetchThumbnails(validIds)
        .then((result) => {
          this.setState({ thumbnails: this.buildImageSrcArrayFromThumbnails(result.thumbnails) });
        })
        .catch((err) => {
          console.error('Failed to fetch thumbnails', err);
          this.setState({ thumbnails: [] });
        });
    } else {
      // Clear thumbnails when no valid attachment IDs exist
      this.setState({ thumbnails: [] });
    }
  }

  async fetchImageThumbnail() {
    const { attachment, preferredThumbnail, ChildrenAttachmentsIds } = this.props;
    const fileType = attachment?.file?.type;
    const isImage = fileType?.startsWith('image/');
    const defaultNoAttachment = '/images/wild_card/no_attachment.svg';
    const defaultUnavailable = '/images/wild_card/not_available.svg';

    // Validate preferredThumbnail is still in the list of valid attachment IDs
    const preferredId = Number(preferredThumbnail);
    const isPreferredValid = preferredThumbnail
      && !Number.isNaN(preferredId)
      && preferredId > 0
      && (ChildrenAttachmentsIds || []).includes(preferredId);

    // render image of preferred attachment thumbnail if available and valid
    if (isPreferredValid) {
      this.setState({ isLoading: true });
      try {
        const src = await fetchImageSrcByAttachmentId(preferredThumbnail);
        this.setState({ thumbnail: src, fetchSrc: src, isLoading: false });
        return;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch preferred thumbnail', err);
        this.setState({ isLoading: false });
      }
    }

    try {
      if (attachment?.thumb) {
        const src = await fetchImageSrcByAttachmentId(attachment.id);
        this.setState({ thumbnail: src });
      } else if (attachment?.is_new || attachment?.is_pending) {
        const previewSrc = isImage ? attachment?.file?.preview : defaultUnavailable;
        this.setState({ thumbnail: previewSrc });
      } else {
        this.setState({ thumbnail: defaultNoAttachment });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch image thumbnail', err);
      this.setState({ thumbnail: defaultUnavailable, isLoading: false });
    }
  }

  showPopObject() {
    const { thumbnail } = this.state;
    const { attachment } = this.props;

    return (
      <Tooltip id="popObject" className="large-preview-modal">
        <img
          src={this.isValidImageSrc(thumbnail) ? thumbnail : '/images/wild_card/not_available.svg'}
          alt={attachment?.filename}
        />
      </Tooltip>
    );
  }

  handleSetPreferred = (thumb) => {
    const { onChangePreferredThumbnail } = this.props;
    this.setState({ currentPreferredThumbnail: thumb.id, thumbnail: thumb.thumbnail });
    if (thumb.id !== this.state.currentPreferredThumbnail) {
      onChangePreferredThumbnail(thumb.id);
    }
  };

  handleThumbPage = (delta) => {
    const { thumbPage, thumbnails } = this.state;
    const thumbnailsPerPage = 6;
    const totalThumbPages = Math.ceil((thumbnails?.length || 0) / thumbnailsPerPage);
    const newPage = thumbPage + delta;
    if (newPage >= 0 && newPage < totalThumbPages) {
      this.setState({ thumbPage: newPage });
    }
  };

  renderAttachmentsThumbnails = () => {
    const { thumbnails: allThumbnails, currentPreferredThumbnail, thumbPage } = this.state;
    const thumbnailsPerPage = 6;
    const totalThumbPages = Math.ceil((allThumbnails?.length || 0) / thumbnailsPerPage);
    const currentThumbs = (allThumbnails || [])
      .slice(
        thumbPage * thumbnailsPerPage,
        (thumbPage + 1) * thumbnailsPerPage
      );
    return (
      <div className="text-center mt-2">
        {allThumbnails && allThumbnails.length > 0 && (
          <div className="d-flex align-items-center justify-content-center my-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => this.handleThumbPage(-1)}
              disabled={thumbPage === 0}
              className="me-2"
            >
              <i className="fa fa-chevron-left" />
            </Button>
            <div className="d-flex flex-row flex-nowrap overflow-auto gap-2">
              {currentThumbs.map((thumb) => (
                <div
                  key={thumb.id}
                  className={`d-flex flex-column align-items-center justify-content-center p-1 rounded
                      ${thumb.id === currentPreferredThumbnail
                    ? 'border-2 border-info bg-info-subtle' : 'border border-secondary bg-white'}`}
                  style={{
                    cursor: 'pointer',
                    minWidth: 64,
                    minHeight: 90,
                    maxWidth: 70,
                    height: 80,
                  }}
                  title={
                    thumb.id === currentPreferredThumbnail
                      ? 'Current Preferred Thumbnail' : 'Set as Preferred display thumbnail for this analysis item'
                  }
                  role="button"
                  tabIndex={0}
                  onClick={() => this.handleSetPreferred(thumb)}
                  onKeyDown={(e) => {
                    this.handleThumbKeyDown(e, thumb);
                  }}
                >
                  <img
                    src={this.isValidImageSrc(thumb.thumbnail)
                      ? thumb.thumbnail : '/images/wild_card/no_attachment.svg'}
                    alt={`Thumbnail ${thumb.id}`}
                    className="img-thumbnail"
                    style={{
                      width: 60, height: 60, objectFit: 'cover', display: 'block'
                    }}
                  />
                  {thumb.id === currentPreferredThumbnail && (
                    <div className="text-primary small mt-1">Preferred</div>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => this.handleThumbPage(1)}
              disabled={thumbPage >= totalThumbPages - 1}
              className="ms-2"
            >
              <i className="fa fa-chevron-right" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  render() {
    const {
      showPop,
      popObject,
      imageStyle,
      attachment,
      placement = 'right'
    } = this.props;
    const {
      pageIndex,
      numOfPages,
      isPdf,
      fetchSrc,
      thumbnail,
    } = this.state;
    const defaultUnavailable = '/images/wild_card/not_available.svg';

    if (showPop) {
      return (
        <div className="preview-table">
          {this.state.isLoading ? (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{
                width: imageStyle?.width || 120,
                height: imageStyle?.height || 120,
                minWidth: 60,
                minHeight: 60,
                ...imageStyle
              }}
            >
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <img
              src={this.isValidImageSrc(thumbnail) ? thumbnail : defaultUnavailable}
              alt={attachment?.filename}
              style={{ cursor: 'default', ...imageStyle }}
              onError={this.handleImageError}
            />
          )}
        </div>
      );
    }

    return (
      <div>
        <div
          className="preview-table"
          onClick={this.handleModalShow}
          onKeyPress={this.handleModalShow}
          role="button"
          tabIndex={0}
        >
          {this.state.isLoading ? (
            <div
              className="d-flex justify-content-center align-items-center"
              style={{
                width: imageStyle?.width || 120,
                height: imageStyle?.height || 120,
                minWidth: 60,
                minHeight: 60,
                ...imageStyle
              }}
            >
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <OverlayTrigger
              placement={placement}
              overlay={this.showPopObject()}
            >
              <img
                src={this.isValidImageSrc(thumbnail) ? thumbnail : defaultUnavailable}
                alt={attachment?.filename}
                style={{ ...imageStyle }}
                role="button"
              />
            </OverlayTrigger>
          )}
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
              <div className="d-flex justify-content-center align-items-center mt-2">
                {this.state.isLoading ? (
                  <div
                    className="d-flex justify-content-center align-items-center"
                    style={{
                      width: imageStyle?.width || 300,
                      height: imageStyle?.height || 300,
                      minWidth: 120,
                      minHeight: 120,
                      ...imageStyle
                    }}
                  >
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={this.isValidImageSrc(fetchSrc) ? fetchSrc : defaultUnavailable}
                    style={{ maxHeight: '100%', maxWidth: '100%', display: 'block' }}
                    alt={attachment?.filename}
                    onError={this.handleImageError}
                  />
                )}
              </div>
            )}
            <div>
              {this.renderAttachmentsThumbnails()}
            </div>
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
  disableClick: PropTypes.bool,
  imageStyle: PropTypes.object,
  preferredThumbnail: PropTypes.string,
  ChildrenAttachmentsIds: PropTypes.arrayOf(PropTypes.number),
  onChangePreferredThumbnail: PropTypes.func,
};

ImageModal.defaultProps = {
  imageStyle: {},
  disableClick: false,
  preferredThumbnail: null,
  ChildrenAttachmentsIds: [],
  onChangePreferredThumbnail: () => { },
};
