/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { stopEvent } from 'src/utilities/DomHelper';
import { Document, Page, pdfjs } from 'react-pdf';
import { fetchImageSrcByAttachmentId } from 'src/utilities/imageHelper';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

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
      currentPreferredThumbnail: props.preferredThumbnail || null,
      thumbPage: 0,
    };

    this.fetchImage = this.fetchImage.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
    this.handleImageError = this.handleImageError.bind(this);
    this.fetchImageThumbnail = this.fetchImageThumbnail.bind(this);
    this.onDocumentLoadSuccess = this.onDocumentLoadSuccess.bind(this);
    this.previousPage = this.previousPage.bind(this);
    this.nextPage = this.nextPage.bind(this);
    this.changePage = this.changePage.bind(this);
  }

  componentDidMount() {
    this.fetchImageThumbnail();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (
      this.state.numOfPages === nextState.numOfPages
      && this.state.numOfPages !== 0
      && this.state.pageIndex === nextState.pageIndex
      && this.state.showModal === nextState.showModal
    ) {
      return false;
    }

    return true;
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
    if (!this.props.disableClick) {
      stopEvent(e);
      this.fetchImage();
      this.fetchThumbnails();
      this.setState({ showModal: true });
    }
  }

  handleImageError() {
    this.setState({ fetchSrc: '/images/wild_card/not_available.svg' });
  }

  onDocumentLoadSuccess(numPages) {
    this.setState({ numOfPages: numPages });
  }

  changePage(offset) {
    this.setState((prevState) => ({ pageIndex: prevState.pageIndex + offset }));
  }

  previousPage() {
    this.changePage(-1);
  }

  nextPage() {
    this.changePage(1);
  }

  fetchImage() {
    try {
      const { attachment } = this.props;
      if (!attachment) throw new Error('Attachment is not provided');
      AttachmentFetcher.fetchImageAttachment({ id: attachment.id, annotated: true }).then(
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
    console.log(thumbnails);
    if (thumbnails && thumbnails.length > 0) {
      return thumbnails.map(({ id, thumbnail }) => ({
        id,
        thumbnail: thumbnail ? `data:image/png;base64,${thumbnail}` : null
      }));
    }
    return [];
  }

  fetchThumbnails() {
    const { ChildrenAttachmentsIds } = this.props;
    console.log('ChildrenAttachmentsIds', ChildrenAttachmentsIds);
    if (ChildrenAttachmentsIds && ChildrenAttachmentsIds.length > 0) {
      AttachmentFetcher.fetchThumbnails(ChildrenAttachmentsIds).then((result) => {
        this.setState({ thumbnails: this.buildImageSrcArrayFromThumbnails(result.thumbnails) });
      });
    }
  }

  async fetchImageThumbnail() {
    const { attachment, preferredThumbnail } = this.props;
    const fileType = attachment?.file?.type;
    const isImage = fileType?.startsWith('image/');
    const defaultNoAttachment = '/images/wild_card/no_attachment.svg';
    const defaultUnavailable = '/images/wild_card/not_available.svg';
    // render image of preferred attachment thumbnail if available
    if (preferredThumbnail) {
      const src = await fetchImageSrcByAttachmentId(preferredThumbnail);
      this.setState({ thumbnail: src, fetchSrc: src });
      return;
    }
    if (attachment?.thumb) {
      const src = await fetchImageSrcByAttachmentId(attachment.id);
      this.setState({ thumbnail: src });
    } else if (attachment?.is_new || attachment?.is_pending) {
      const previewSrc = isImage ? attachment?.file?.preview : defaultUnavailable;
      this.setState({ thumbnail: previewSrc });
    } else {
      this.setState({ thumbnail: defaultNoAttachment });
    }
  }

  handleSetPreferred = (thumb) => {
    const { onChangePreferredThumbnail } = this.props;
    const { currentPreferredThumbnail } = this.state;
    this.setState({ currentPreferredThumbnail: thumb.id, thumbnail: thumb.thumbnail });
    onChangePreferredThumbnail(currentPreferredThumbnail);
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
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      this.handleSetPreferred(thumb);
                    }
                  }}
                >
                  <img
                    src={thumb.thumbnail || '/images/wild_card/no_attachment.svg'}
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
    } = this.props;
    const {
      pageIndex,
      numOfPages,
      isPdf,
      fetchSrc,
      thumbnail,
      thumbnails,
    } = this.state;
    console.log(thumbnail);
    console.log("hamada");
    console.log(this.state.fetchSrc);

    if (showPop) {
      return (
        <div className="preview-table">
          <img
            src={thumbnail}
            alt={attachment?.filename}
            style={{ cursor: 'default', ...imageStyle }}
            onError={this.handleImageError}
          />
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
          <img
            src={thumbnail}
            alt={attachment?.filename}
            style={{ ...imageStyle }}
            role="button"
          />
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
            <div>
              {isPdf && fetchSrc ? (
                <div>
                  <Document
                    file={{ url: fetchSrc }}
                    onLoadSuccess={(pdf) => this.onDocumentLoadSuccess(pdf.numPages)}
                  >
                    <Page pageNumber={pageIndex} renderAnnotationLayer={false} renderTextLayer={false} />
                  </Document>
                  <div>
                    <p>
                      Page
                      {' '}
                      {pageIndex || (numOfPages ? 1 : '--')}
                      {' '}
                      of
                      {' '}
                      {numOfPages || '--'}
                    </p>
                    <button
                      type="button"
                      disabled={pageIndex <= 1}
                      onClick={this.previousPage}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={pageIndex >= numOfPages}
                      onClick={this.nextPage}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="d-flex justify-content-center align-items-center mt-2">
                  <img
                    src={this.state.fetchSrc}
                    style={{ maxHeight: '100%', maxWidth: '100%', display: 'block' }}
                    alt={attachment?.filename}
                    onError={this.handleImageError}
                  />
                </div>
              )}
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
  }).isRequired,
  showPop: PropTypes.bool.isRequired,
  popObject: PropTypes.shape({
    title: PropTypes.string,
  }).isRequired,
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
};
