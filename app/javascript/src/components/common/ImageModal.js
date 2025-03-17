/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import { stopEvent } from 'src/utilities/DomHelper';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export default class ImageModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fetchSrc: props.popObject.src,
      showModal: false,
      isPdf: false,
      pageIndex: 1,
      numOfPages: 0,
    };

    this.fetchImage = this.fetchImage.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
    this.handleImageError = this.handleImageError.bind(this);
    this.onDocumentLoadSuccess = this.onDocumentLoadSuccess.bind(this);
    this.previousPage = this.previousPage.bind(this);
    this.nextPage = this.nextPage.bind(this);
    this.changePage = this.changePage.bind(this);
  }

  componentDidMount() {
    if (this.props.popObject.fetchNeeded) {
      this.fetchImage();
    }
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
    if (
      this.props.popObject.fetchNeeded
      && this.props.popObject.fetchId !== prevProps.popObject.fetchId
    ) {
      this.fetchImage();
    }
  }

  handleModalClose(e) {
    stopEvent(e);
    this.setState({ showModal: false });
  }

  handleModalShow(e) {
    if (!this.props.disableClick) {
      stopEvent(e);
      this.setState({ showModal: true });
    }
  }

  handleImageError() {
    this.setState({ fetchSrc: this.props.previewObject.src });
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
    const { popObject } = this.props;
    if (!popObject.fetchId) { return null; }
    const type = popObject?.fileName?.split('.').pop().toLowerCase();

    AttachmentFetcher.fetchImageAttachment({ id: popObject.fetchId, annotated: true }).then(
      (result) => {
        if (result.data != null) {
          this.setState({ fetchSrc: result.data, isPdf: type === 'pdf' });
        }
      }
    );
  }

  render() {
    const {
      hasPop, previewObject, popObject, imageStyle, showPopImage
    } = this.props;
    const { pageIndex, numOfPages, isPdf, fetchSrc } = this.state;

    if (!hasPop) {
      return (
        <div className="preview-table">
          <img
            src={previewObject.src}
            alt=""
            style={{ cursor: 'default', ...imageStyle }}
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
            src={showPopImage ? popObject.src : previewObject.src}
            alt=""
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
            {isPdf ? (
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
                    onClick={() => this.previousPage()}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={pageIndex >= numOfPages}
                    onClick={() => this.nextPage()}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <img
                src={this.state.fetchSrc}
                style={{ display: 'block', maxHeight: '100%', maxWidth: '100%' }}
                alt=""
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
  imageStyle: PropTypes.object,
  hasPop: PropTypes.bool.isRequired,
  previewObject: PropTypes.shape({
    src: PropTypes.string,
  }).isRequired,
  popObject: PropTypes.shape({
    title: PropTypes.string,
    src: PropTypes.string,
    fileName: PropTypes.string,
    fetchNeeded: PropTypes.bool,
    fetchId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
  disableClick: PropTypes.bool,
  showPopImage: PropTypes.bool,
};

ImageModal.defaultProps = {
  imageStyle: {},
  disableClick: false,
  showPopImage: false
};
