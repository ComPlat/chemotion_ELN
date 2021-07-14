import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import SVG from 'react-inlinesvg';

export default class SvgWithPopover extends Component {
  constructor(props) {
    super(props);
    this.renderPreview = this.renderPreview.bind(this);
  }

  popHover() {
    const { popObject } = this.props;

    return (
      <Popover
        id="popover-trigger-hover-focus"
        title={popObject.title}
        style={{ maxWidth: 'none', maxHeight: 'none' }}
      >
        <img src={popObject.src} style={{ height: popObject.height, width: popObject.width }} alt="" />
      </Popover>
    );
  }

  renderPreview() {
    const { previewObject } = this.props;
    let previewObj = previewObject.txtOnly;
    if (previewObj === '') {
      previewObj = (
        previewObject.isSVG ?
          <SVG src={previewObject.src} className="molecule" key={previewObject.src} />
          :
          <img src={previewObject.src} alt="" />
      );
    }

    return (
      <div className="preview-table">
        {previewObj}
      </div>
    );
  }

  render() {
    const { hasPop } = this.props;

    if (!hasPop) {
      return this.renderPreview();
    }

    return (
      <div>
        <OverlayTrigger
          trigger={['hover', 'focus']}
          placement="right"
          rootClose
          onHide={null}
          overlay={this.popHover()}
        >
          {this.renderPreview()}
        </OverlayTrigger>
      </div>
    );
  }
}

SvgWithPopover.propTypes = {
  hasPop: PropTypes.bool.isRequired,
  previewObject: PropTypes.shape({
    txtOnly: PropTypes.string.isRequired,
    isSVG: PropTypes.bool,
    src: PropTypes.string,
  }).isRequired,
  popObject: PropTypes.shape({
    title: PropTypes.string,
    src: PropTypes.string,
    height: PropTypes.string,
    width: PropTypes.string,
  }).isRequired,
};
