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
      thumbnail: ''
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

  render() {
    const {
      showPop, popObject, attachment
    } = this.props;
    const {
      pageIndex, numOfPages, isPdf, fetchSrc, thumbnail
    } = this.state;

    if (showPop) {
      return (
        <div className="preview-table">
          <img
            src={thumbnail}
            alt={attachment?.filename}
            style={{ cursor: 'default' }}
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
              <img
                src={this.state.fetchSrc}
                style={{ display: 'block', maxHeight: '100%', maxWidth: '100%' }}
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
  }).isRequired,
  showPop: PropTypes.bool.isRequired,
  popObject: PropTypes.shape({
    title: PropTypes.string,
  }).isRequired,
  disableClick: PropTypes.bool,
};

ImageModal.defaultProps = {
  disableClick: false,
};
