import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';
import { stopEvent } from '../utils/DomHelper';

export default class ImageModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      fetchSrc: props.popObject.src,
      showModal: false,
    };
    this.fetchImage = this.fetchImage.bind(this);
    this.handleModalClose = this.handleModalClose.bind(this);
    this.handleModalShow = this.handleModalShow.bind(this);
  }

  componentDidMount() {
    if (this.props.popObject.fetchNeeded) {
      this.fetchImage();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.popObject.fetchNeeded) {
      if (this.props.popObject.fetchId !== prevProps.popObject.fetchId) {
        this.fetchImage();
      }
    }
  }

  fetchImage() {
    AttachmentFetcher.fetchImageAttachment({ id: this.props.popObject.fetchId })
      .then((result) => {
        if (result != null) {
          this.setState({ fetchSrc: result });
        }
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

  render() {
    const { hasPop, preivewObject, popObject } = this.props;

    if (!hasPop) {
      return (<div className="preview-table"><img src={preivewObject.src} alt="" style={{ cursor: 'default' }} /></div>);
    }

    return (
      <div>
        <div className="preview-table" onClick={this.handleModalShow}>
          <img src={preivewObject.src} alt="" style={{ cursor: 'pointer' }} />
        </div>
        <Modal show={this.state.showModal} onHide={this.handleModalClose} dialogClassName="noticeModal">
          <Modal.Header closeButton>
            <Modal.Title>{popObject.title}</Modal.Title>
          </Modal.Header>

          <Modal.Body style={{ overflow: 'auto', position: 'relative' }}>
            <img
              src={this.state.fetchSrc}
              style={{
                display: 'block',
                height: 'auto',
                width: 'auto'
              }}
              alt=""
            />
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
  hasPop: PropTypes.bool.isRequired,
  preivewObject: PropTypes.shape({
    src: PropTypes.string,
  }).isRequired,
  popObject: PropTypes.shape({
    title: PropTypes.string,
    src: PropTypes.string,
    fetchNeeded: PropTypes.bool,
    fetchId: PropTypes.number,
  }).isRequired,
};
