/* eslint-disable react/destructuring-assignment, react/sort-comp */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip, Button } from 'react-bootstrap';
import AppModal from 'src/components/common/AppModal';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { stopEvent } from 'src/utilities/DomHelper';
import {
  fetchImageSrcByAttachmentId,
  getContainerImageData,
} from 'src/utilities/imageHelper';

const DEFAULT_NO_ATTACHMENT = '/images/wild_card/no_attachment.svg';
const DEFAULT_UNAVAILABLE = '/images/wild_card/not_available.svg';

// Valid, displayable image src. (The upstream `[object Object]` leak from
// fetchImageSrcByAttachmentId's error path should be fixed there, not masked here.)
const isValidImageSrc = (src) => typeof src === 'string' && src.length > 0;

// Font-awesome icon for an attachment that has no rendered thumbnail, by extension.
const fileIconClass = (filename) => {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'fa-file-pdf-o';
  if (['doc', 'docx', 'odt'].includes(ext)) return 'fa-file-word-o';
  if (['xls', 'xlsx', 'csv', 'ods'].includes(ext)) return 'fa-file-excel-o';
  if (['zip', 'gz', 'tar', '7z', 'rar'].includes(ext)) return 'fa-file-archive-o';
  return 'fa-file-o';
};

export default class ImageModal extends Component {
  // Resolve effective inputs from `container` (analysis mode) or `attachment` (single image).
  // Usable before `this` is set up (called from the constructor).
  static derive(props) {
    if (props.container) {
      const {
        previewAttachment, candidates, candidateIds, preferredId,
      } = getContainerImageData(props.container);
      return {
        attachment: previewAttachment, candidates, candidateIds, preferredId,
      };
    }
    // single-image mode (e.g. element table/list thumbnails): no carousel, no preferred
    return {
      attachment: props.attachment, candidates: [], candidateIds: [], preferredId: null,
    };
  }

  constructor(props) {
    super(props);
    const { preferredId } = ImageModal.derive(props);
    this.state = {
      showModal: false,
      isPdf: false,
      isLoading: false,
      thumbnail: '', // grey-area preview src (= preferred, else default)
      thumbnails: [], // carousel: [{ id, filename, thumbnail }]
      preferredId, // persisted preferred id (shared across viewers)
      selectedId: null, // currently previewed-large id (transient, not persisted)
      modalPreviewSrc: '', // full-res src shown large in the modal main area
    };

    this.handleModalShow = this.handleModalShow.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleImageError = this.handleImageError.bind(this);
    this.fetchPreviewThumbnail = this.fetchPreviewThumbnail.bind(this);
  }

  componentDidMount() {
    this.fetchPreviewThumbnail();
  }

  componentDidUpdate(prevProps) {
    const prev = ImageModal.derive(prevProps);
    const curr = ImageModal.derive(this.props);

    const attachmentChanged = prev.attachment?.id !== curr.attachment?.id;
    const preferredChanged = prev.preferredId !== curr.preferredId;
    const idsChanged = prev.candidateIds.length !== curr.candidateIds.length
      || !prev.candidateIds.every((id, i) => id === curr.candidateIds[i]);

    if (preferredChanged) this.setState({ preferredId: curr.preferredId });
    if (attachmentChanged || preferredChanged || idsChanged) this.fetchPreviewThumbnail();
  }

  handleImageError() {
    this.setState({ modalPreviewSrc: DEFAULT_UNAVAILABLE });
  }

  handleModalClose(e) {
    stopEvent(e);
    // Pure no-op on cancel: nothing is mutated or persisted by previewing.
    this.setState({ showModal: false });
  }

  handleModalShow(e) {
    if (this.props.disableClick) return;
    stopEvent(e);
    const { attachment, candidateIds, preferredId } = ImageModal.derive(this.props);

    // Not-yet-uploaded attachments have a client-side uuid, not a server id: there's
    // nothing to fetch yet, so show the local blob preview instead.
    if (attachment?.is_new || attachment?.is_pending) {
      const isImage = attachment?.file?.type?.startsWith('image/');
      this.setState({
        showModal: true,
        selectedId: null,
        preferredId,
        modalPreviewSrc: isImage ? attachment?.preview : DEFAULT_UNAVAILABLE,
      });
      return;
    }

    // Fall back to the first candidate so a PDF-only analysis (no thumbnailed default) still
    // opens on a selectable attachment.
    const selectedId = preferredId
      || (attachment?.id ? Number(attachment.id) : null)
      || candidateIds[0]
      || null;
    this.setState({
      showModal: true, selectedId, preferredId, modalPreviewSrc: '',
    });
    this.fetchCarouselThumbnails();
    if (selectedId) this.fetchLargeImage(selectedId);
  }

  // grey-area preview (preferred, else default attachment)
  async fetchPreviewThumbnail() {
    const { attachment, preferredId } = ImageModal.derive(this.props);
    try {
      if (preferredId) {
        const src = await fetchImageSrcByAttachmentId(preferredId);
        this.setState({ thumbnail: src });
        return;
      }
      if (attachment?.thumb) {
        const src = await fetchImageSrcByAttachmentId(attachment.id);
        this.setState({ thumbnail: src });
      } else if (attachment?.is_new || attachment?.is_pending) {
        const isImage = attachment?.file?.type?.startsWith('image/');
        this.setState({ thumbnail: isImage ? attachment?.preview : DEFAULT_UNAVAILABLE });
      } else {
        this.setState({ thumbnail: DEFAULT_NO_ATTACHMENT });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to fetch preview thumbnail', err);
      this.setState({ thumbnail: DEFAULT_UNAVAILABLE });
    }
  }

  // carousel of all selectable thumbnails
  fetchCarouselThumbnails() {
    const { candidates, candidateIds } = ImageModal.derive(this.props);
    if (!candidateIds.length) {
      this.setState({ thumbnails: [] });
      return;
    }
    const nameById = new Map(candidates.map((c) => [c.id, c.filename]));
    AttachmentFetcher.fetchThumbnails(candidateIds)
      .then((result) => {
        const thumbnails = (result.thumbnails || []).map(({ id, thumbnail }) => ({
          id,
          filename: nameById.get(id) || '',
          // null when the attachment has no rendered thumbnail (e.g. PDF without a
          // generated preview) — the carousel then shows a typed file-icon placeholder.
          thumbnail: (typeof thumbnail === 'string' && thumbnail.length > 0)
            ? `data:image/png;base64,${thumbnail}`
            : null,
        }));
        this.setState({ thumbnails });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch thumbnails', err);
        this.setState({ thumbnails: [] });
      });
  }

  // full-resolution large display of the selected image; the spinner covers the load.
  fetchLargeImage(id) {
    this.setState({ isLoading: true, isPdf: false });
    AttachmentFetcher.fetchImageAttachment({ id })
      .then((result) => {
        if (!result?.data) throw new Error('No image data');
        this.setState({
          modalPreviewSrc: result.data,
          isPdf: result.type === 'application/pdf',
          isLoading: false,
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch full image', err);
        this.setState({ isLoading: false, modalPreviewSrc: DEFAULT_UNAVAILABLE });
      });
  }

  // click a thumbnail = preview large only; never persists
  handleSelectThumbnail = (thumb) => {
    this.setState({ selectedId: thumb.id });
    this.fetchLargeImage(thumb.id);
  };

  handleThumbKeyDown = (e, thumb) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleSelectThumbnail(thumb);
    }
  };

  // explicit, separate action = persist preferred (shared across viewers)
  handleSetPreferred = () => {
    const { selectedId, preferredId } = this.state;
    if (!selectedId || selectedId === preferredId) return;
    this.setState({ preferredId: selectedId });
    this.props.onPreferredThumbnailChange(selectedId); // parent writes metadata + persists
    this.fetchPreviewThumbnail(); // refresh grey-area preview to the new preferred
  };

  showPopObject() {
    const { thumbnail } = this.state;
    const { attachment } = ImageModal.derive(this.props);
    return (
      <Tooltip id="popObject" className="large-preview-modal">
        <img
          src={isValidImageSrc(thumbnail) ? thumbnail : DEFAULT_UNAVAILABLE}
          alt={attachment?.filename}
        />
      </Tooltip>
    );
  }

  renderCarousel() {
    const { thumbnails, selectedId, preferredId } = this.state;
    if (!thumbnails.length) return null;
    return (
      <div className="d-flex flex-row flex-nowrap overflow-auto gap-2 justify-content-center mt-3 pt-2">
        {thumbnails.map((thumb) => {
          const isPreferred = thumb.id === preferredId;
          const isSelected = thumb.id === selectedId;
          const cls = isSelected ? 'border-2 border-primary' : 'border border-secondary';
          return (
            <div
              key={thumb.id}
              className={`d-flex flex-column align-items-center p-1 rounded bg-white ${cls}`}
              style={{
                cursor: 'pointer', minWidth: 72, maxWidth: 72, height: 96,
              }}
              role="button"
              tabIndex={0}
              title={`${thumb.filename || `attachment ${thumb.id}`}${isPreferred ? ' (current preferred)' : ''}`}
              onClick={() => this.handleSelectThumbnail(thumb)}
              onKeyDown={(e) => this.handleThumbKeyDown(e, thumb)}
            >
              {isValidImageSrc(thumb.thumbnail) ? (
                <img
                  src={thumb.thumbnail}
                  alt={thumb.filename || `attachment ${thumb.id}`}
                  style={{ width: 56, height: 56, objectFit: 'cover' }}
                />
              ) : (
                // no rendered thumbnail (e.g. PDF without a generated preview)
                <div
                  className="d-flex align-items-center justify-content-center text-body-tertiary"
                  style={{ width: 56, height: 56 }}
                >
                  <i className={`fa ${fileIconClass(thumb.filename)} fa-2x`} aria-hidden="true" />
                </div>
              )}
              <span
                className="text-truncate w-100 text-center"
                style={{ fontSize: '0.6rem', lineHeight: 1.1 }}
              >
                {isPreferred && <i className="fa fa-star text-primary me-1" />}
                {thumb.filename || `#${thumb.id}`}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  renderPreviewBox() {
    const { isLoading, thumbnail } = this.state;
    const { imageStyle } = this.props;
    const { attachment } = ImageModal.derive(this.props);
    if (isLoading) {
      return (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ width: imageStyle?.width || 120, height: imageStyle?.height || 120, ...imageStyle }}
        >
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }
    return (
      <img
        src={isValidImageSrc(thumbnail) ? thumbnail : DEFAULT_UNAVAILABLE}
        alt={attachment?.filename}
        style={{ ...imageStyle }}
        onError={this.handleImageError}
      />
    );
  }

  render() {
    const { showPop, popObject, placement = 'right' } = this.props;
    const {
      isPdf, isLoading, modalPreviewSrc, selectedId, preferredId, thumbnails,
    } = this.state;
    const { attachment, candidates } = ImageModal.derive(this.props);
    // Preferred selection only applies in analysis mode (a carousel of candidates exists).
    const canSelectPreferred = thumbnails.length > 0;
    const canSetPreferred = selectedId && selectedId !== preferredId;
    // Filename of the image currently shown large (any file type), for the caption.
    const selectedFilename = candidates.find((c) => c.id === selectedId)?.filename
      || attachment?.filename || '';

    if (showPop) {
      return <div className="preview-table">{this.renderPreviewBox()}</div>;
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
          {isLoading ? this.renderPreviewBox() : (
            <OverlayTrigger placement={placement} overlay={this.showPopObject()}>
              {this.renderPreviewBox()}
            </OverlayTrigger>
          )}
        </div>

        <AppModal
          title={popObject.title}
          show={this.state.showModal}
          onHide={this.handleModalClose}
          dialogClassName="noticeModal"
          size="xxxl"
          closeLabel="Close"
          showFooter
        >
          <div style={{ overflow: 'auto', position: 'relative', minHeight: 400 }}>
            {selectedFilename && (
              <div className="text-center text-body-secondary text-truncate mb-2" title={selectedFilename}>
                <i className="fa fa-file-o me-1" aria-hidden="true" />
                {selectedFilename}
              </div>
            )}
            {/* main preview: PDF in an iframe, everything else as an image */}
            {isPdf && modalPreviewSrc ? (
              <iframe
                src={modalPreviewSrc}
                width="100%"
                height="500px"
                style={{ border: 'none' }}
                title="PDF Viewer"
              />
            ) : (
              <div
                className="d-flex justify-content-center align-items-center bg-light rounded position-relative"
                style={{ minHeight: 300, maxHeight: 420 }}
              >
                {isLoading ? (
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                ) : (
                  <img
                    src={isValidImageSrc(modalPreviewSrc) ? modalPreviewSrc : DEFAULT_UNAVAILABLE}
                    className="img-fluid"
                    style={{ maxHeight: 400, objectFit: 'contain' }}
                    alt={attachment?.filename}
                    onError={this.handleImageError}
                  />
                )}
              </div>
            )}
            {/* selection controls — shown for both image and PDF previews */}
            {canSelectPreferred && (
              <div className="d-flex justify-content-center mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canSetPreferred}
                  onClick={this.handleSetPreferred}
                >
                  <i className="fa fa-star me-1" />
                  {preferredId && selectedId === preferredId ? 'Preferred image' : 'Set as preferred'}
                </Button>
              </div>
            )}
            {this.renderCarousel()}
          </div>
        </AppModal>
      </div>
    );
  }
}

ImageModal.propTypes = {
  // analysis mode (preferred): everything is derived from the container
  container: PropTypes.shape({
    name: PropTypes.string,
    children: PropTypes.arrayOf(PropTypes.shape({})),
    extended_metadata: PropTypes.shape({}),
  }),
  onPreferredThumbnailChange: PropTypes.func,
  // single-image mode (mutually exclusive with `container`): element table/list thumbnails
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
    }),
  }),
  popObject: PropTypes.shape({
    title: PropTypes.string,
  }).isRequired,
  placement: PropTypes.string,
  disableClick: PropTypes.bool,
  imageStyle: PropTypes.shape({
    width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  showPop: PropTypes.bool,
};

ImageModal.defaultProps = {
  container: null,
  attachment: null,
  onPreferredThumbnailChange: () => { },
  placement: 'right',
  disableClick: false,
  imageStyle: {},
  showPop: false,
};
