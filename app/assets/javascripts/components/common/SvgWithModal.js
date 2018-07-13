import React, { Component, PropTypes } from 'react';
import { Modal } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';

import { stopEvent } from '../utils/DomHelper';

export default class SvgWithModal extends Component {
  constructor(props) {
    super(props);

    this.handleShow = this.handleShow.bind(this);
    this.handleClose = this.handleClose.bind(this);
    this.clickSvg = this.clickSvg.bind(this);
    this.renderModal = this.renderModal.bind(this);
    this.renderPreview = this.renderPreview.bind(this);

    this.state = {
      show: false,
    };
  }

  handleClose() {
    this.setState({ show: false });
  }

  handleShow() {
    this.setState({ show: true });
  }

  clickSvg(e) {
    stopEvent(e);
    this.handleShow();
  }

  extractTitle(el) {
    switch (el.type) {
      case 'reaction':
        return el.short_label;
      case 'sample':
        return el.molecule_iupac_name;
      default:
        return '';
    }
  }

  renderModal() {
    const { show } = this.state;
    const { element } = this.props;
    const title = this.extractTitle(element);

    return (
      <Modal
        show={show}
        onHide={this.handleClose}
        dialogClassName="preview-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SvgFileZoomPan
            svgPath={element.svgPath}
            duration={300}
            resize
          />
        </Modal.Body>
      </Modal>
    );
  }

  renderPreview() {
    const { element, classNames } = this.props;

    return (
      <div className="preview-table">
        <SVG
          src={element.svgPath}
          className={classNames}
          key={element.svgPath}
        />
      </div>
    );
  }

  render() {
    return (
      <div onClick={this.clickSvg}>
        { this.renderPreview() }
        { this.renderModal() }
      </div>
    );
  }
}

SvgWithModal.propTypes = {
  element: PropTypes.object.isRequired,
  classNames: PropTypes.string.isRequired,
};
