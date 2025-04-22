import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import SvgFileZoomPan from 'react-svg-file-zoom-pan-latest';

export default class SvgWithPopover extends Component {
  constructor(props) {
    super(props);
    this.renderPreview = this.renderPreview.bind(this);
  }

  popHover() {
    const { popObject, previewObject } = this.props;
    return (
      <Popover>
        {
          popObject.title && <Popover.Header as="h3">{popObject.title}</Popover.Header>
        }
        <Popover.Body className="svg-file-zoom-pan-container">
          {
            previewObject.isSVG
            ? 
            <SvgFileZoomPan
              svgPath={popObject.src}
              duration={0}
              resize
            />
            : <img src={popObject.src} style={{ height: popObject.height, width: popObject.width }} alt="" />
          }
        </Popover.Body>
      </Popover>
    );
  }

  renderPreview() {
    const { previewObject } = this.props;
    let previewObj = previewObject.txtOnly;
    if (previewObj === '') {
      previewObj = (
        previewObject.isSVG
          ? <SVG src={previewObject.src} className={previewObject.className || 'molecule'} key={previewObject.src} />
          : <img src={previewObject.src} className={previewObject.className} alt="" />
      );
    }

    return (
      <div className="preview-table">
        {previewObj}
      </div>
    );
  }

  render() {
    const { hasPop, placement } = this.props;

    if (!hasPop) {
      return this.renderPreview();
    }

    return (
      <div>
        <OverlayTrigger
          trigger={['hover', 'focus']}
          placement={placement}
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
    className: PropTypes.string,
  }).isRequired,
  popObject: PropTypes.shape({
    title: PropTypes.string,
    src: PropTypes.string,
    height: PropTypes.string,
    width: PropTypes.string,
  }).isRequired,
  placement: PropTypes.string,
};
SvgWithPopover.defaultProps = {
  placement: 'right',
};
