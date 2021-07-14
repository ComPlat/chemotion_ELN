import React, { Component, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';
import { stopEvent } from '../utils/DomHelper';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

export default class ImageModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fetchSrc: props.popObject.src,
      showModal: false,
      isPdf: false,
      pageIndex: 1,
      numOfPages: 0
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

  componentDidUpdate(prevProps) {
    if (this.props.popObject.fetchNeeded &&
      (this.props.popObject.fetchId !== prevProps.popObject.fetchId)) {
      this.fetchImage();
    }
  }

  onDocumentLoadSuccess(numPages) {
    this.setState({ numOfPages: numPages });
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.numOfPages == nextState.numOfPages
      && this.state.numOfPages != 0
      && this.state.pageIndex == nextState.pageIndex
      && this.state.showModal == nextState.showModal) {
      return false;
    }

    return true;
  }

  changePage(offset) {
    this.setState({pageIndex:(this.state.pageIndex+offset)});
  }

  previousPage() {
    this.changePage(-1);
  }

  nextPage() {
    this.changePage(1);
  }

  fetchImage() {
    AttachmentFetcher.fetchImageAttachment({ id: this.props.popObject.fetchId })
      .then((result) => {
        if (result.data != null) { this.setState({ fetchSrc: result.data, isPdf: (result.type === 'application/pdf') }); }
      });
  }

  handleModalClose(e) {
    stopEvent(e);
    this.setState({ showModal: false });
  }

  handleModalShow(e) {
    stopEvent(e);
    this.setState({ showModal: true });
  }

  handleImageError() {
    this.setState({ fetchSrc: this.props.previewObject.src });
  }

  render() {
    const {
      hasPop, previewObject, popObject, imageStyle
    } = this.props;
    const { pageIndex, numOfPages } = this.state;
    if (!hasPop) {
      return (<div className="preview-table"><img src={previewObject.src} alt="" style={{ cursor: 'default', ...imageStyle }} /></div>);
    }

    return (
      <div>
        <div className="preview-table" onClick={this.handleModalShow}>
          <img src={previewObject.src} alt="" style={{ cursor: 'pointer', ...imageStyle }} />
        </div>
        <Modal show={this.state.showModal} onHide={this.handleModalClose} dialogClassName="noticeModal">
          <Modal.Header closeButton>
            <Modal.Title>{popObject.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ overflow: 'auto', position: 'relative' }}>
            {this.state.isPdf ?
              <div>
                <Document file={{ url: this.state.fetchSrc }}
                  onLoadSuccess={(pdf) => this.onDocumentLoadSuccess(pdf.numPages)}>
                  <Page pageNumber={pageIndex} />
                </Document>
                <div>
                  <p>
                    Page {pageIndex || (numOfPages ? 1 : '--')} of {numOfPages || '--'}
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
              :
              <img src={this.state.fetchSrc} style={{ display: 'block', maxHeight: '100%', maxWidth: '100%' }} alt="" onError={this.handleImageError} />}
          </Modal.Body>
          <Modal.Footer>
            <Button bsStyle="primary" onClick={this.handleModalClose} className="pull-left">Close</Button>
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
    fetchNeeded: PropTypes.bool,
    fetchId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
};
