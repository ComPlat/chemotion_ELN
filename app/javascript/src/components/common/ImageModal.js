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
      thumbnail: '',
      thumbnails: [],
      currentPreferredThumbnail: Number(props.preferredThumbnail) || null,
      thumbPage: 0,
      isLoading: false,
      // 'preview' = clicking thumbnail only previews it; 'select' = sets it as preferred
      thumbMode: 'select',
      // src shown in modal main image area (may differ from the saved preferred)
      modalPreviewSrc: '',
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
      this.handleThumbClick(thumb);
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
      this.setState((prevState) => ({
        showModal: true,
        currentPreferredThumbnail: preferredThumbnail ? Number(preferredThumbnail) : null,
        // Reset modal preview to current thumbnail so preferred image shows immediately
        modalPreviewSrc: prevState.thumbnail || '',
        thumbMode: 'select',
      }));
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
          const src = result.data;
          // Only update modalPreviewSrc from fetchImage if no preferred thumbnail is active
          this.setState((prevState) => ({
            fetchSrc: src,
            isPdf: result.type === 'application/pdf',
            modalPreviewSrc: prevState.currentPreferredThumbnail
              ? prevState.modalPreviewSrc
              : src,
          }));
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
        this.setState({
          thumbnail: src,
          fetchSrc: src,
          modalPreviewSrc: src,
          isLoading: false,
        });
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
    this.setState({
      currentPreferredThumbnail: thumb.id,
      thumbnail: thumb.thumbnail,
      modalPreviewSrc: thumb.thumbnail,
    });
    if (thumb.id !== this.state.currentPreferredThumbnail) {
      onChangePreferredThumbnail(thumb.id);
    }
  };

  // Handles thumbnail click depending on current mode
  handleThumbClick = (thumb) => {
    const { thumbMode } = this.state;
    if (thumbMode === 'select') {
      this.handleSetPreferred(thumb);
    } else {
      // preview mode: only update the modal preview image, do not change preferred
      this.setState({ modalPreviewSrc: thumb.thumbnail });
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
    const {
      thumbnails: allThumbnails, currentPreferredThumbnail, thumbPage, thumbMode,
    } = this.state;
    const thumbnailsPerPage = 6;
    const totalThumbPages = Math.ceil((allThumbnails?.length || 0) / thumbnailsPerPage);
    const currentThumbs = (allThumbnails || [])
      .slice(
        thumbPage * thumbnailsPerPage,
        (thumbPage + 1) * thumbnailsPerPage
      );

    if (!allThumbnails || allThumbnails.length === 0) return null;

    return (
      <div className="mt-3 pt-2">
        {/* Mode toggle */}
        <div className="d-flex align-items-center justify-content-center gap-2 mb-2">
          <span className="text-muted small">Thumbnail mode:</span>
          <div className="btn-group btn-group-sm" role="group" aria-label="Thumbnail mode">
            <button
              type="button"
              className={`btn ${thumbMode === 'preview' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => this.setState({ thumbMode: 'preview' })}
              title="Click a thumbnail to preview it without changing the preferred selection"
            >
              <i className="fa fa-eye me-1" />
              Preview only
            </button>
            <button
              type="button"
              className={`btn ${thumbMode === 'select' ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => this.setState({ thumbMode: 'select' })}
              title="Click a thumbnail to set it as the preferred display image"
            >
              <i className="fa fa-star me-1" />
              Set preferred
            </button>
          </div>
        </div>

        {/* Thumbnail strip */}
        <div className="d-flex align-items-center justify-content-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => this.handleThumbPage(-1)}
            disabled={thumbPage === 0}
            className="me-2 flex-shrink-0"
          >
            <i className="fa fa-chevron-left" />
          </Button>
          <div className="d-flex flex-row flex-nowrap overflow-auto gap-2">
            {currentThumbs.map((thumb) => {
              const isPreferred = thumb.id === currentPreferredThumbnail;
              const cardClass = isPreferred
                ? 'border-2 border-info bg-info-subtle'
                : 'border border-secondary bg-white';
              let modeTitle;
              if (thumbMode === 'select') {
                modeTitle = isPreferred ? 'Current preferred thumbnail'
                  : 'Set as preferred display thumbnail by selecting this image using set preferred mode';
              } else {
                modeTitle = 'Preview this image';
              }
              return (
                <div
                  key={thumb.id}
                  className={`d-flex flex-column align-items-center justify-content-center p-1 rounded ${cardClass}`}
                  style={{
                    cursor: 'pointer', minWidth: 64, minHeight: 90, maxWidth: 70, height: 80,
                  }}
                  title={modeTitle}
                  role="button"
                  tabIndex={0}
                  onClick={() => this.handleThumbClick(thumb)}
                  onKeyDown={(e) => this.handleThumbKeyDown(e, thumb)}
                >
                  <img
                    src={this.isValidImageSrc(thumb.thumbnail)
                      ? thumb.thumbnail : '/images/wild_card/no_attachment.svg'}
                    alt={`Thumbnail ${thumb.id}`}
                    className="img-thumbnail"
                    style={{
                      width: 60, height: 60, objectFit: 'cover', display: 'block',
                    }}
                  />
                  {isPreferred && (
                    <div className="text-primary small mt-1" style={{ fontSize: '0.65rem' }}>
                      <i className="fa fa-star me-1" />
                      Preferred
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => this.handleThumbPage(1)}
            disabled={thumbPage >= totalThumbPages - 1}
            className="ms-2 flex-shrink-0"
          >
            <i className="fa fa-chevron-right" />
          </Button>
        </div>
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
      isPdf,
      fetchSrc,
      thumbnail,
      modalPreviewSrc,
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
          <Modal.Body style={{ overflow: 'auto', position: 'relative' }}>
            {isPdf && fetchSrc ? (
              <iframe
                src={fetchSrc}
                width="100%"
                height="500px"
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
              <div
                className="d-flex justify-content-center align-items-center bg-light rounded"
                style={{ minHeight: 300, maxHeight: 420 }}
              >
                {this.state.isLoading ? (
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <img
                    src={this.isValidImageSrc(modalPreviewSrc) ? modalPreviewSrc : defaultUnavailable}
                    className="img-fluid"
                    style={{ maxHeight: 400, objectFit: 'contain' }}
                    alt={attachment?.filename}
                    onError={this.handleImageError}
                  />
                )}
              </div>
            )}
            {this.renderAttachmentsThumbnails()}
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
