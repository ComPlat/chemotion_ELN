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
    const { objTitle, objSrc } = this.props;
    return (
      <Popover
        id="popover-trigger-hover-focus"
        title={objTitle}
        style={{ maxWidth: 'none', maxHeight: 'none' }}
      >
        <img src={objSrc} style={{ height: '26vh', width: '52vw' }} alt="" />
      </Popover>
    );
  }

  renderPreview() {
    const { objSrc, objPreview } = this.props;

    return (
      <div className="preview-table">
        {
        objPreview === '' ? <SVG
          src={objSrc}
          className="molecule"
          key={objSrc}
        /> :
        objPreview
        }
      </div>
    );
  }

  render() {
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
  objTitle: PropTypes.string.isRequired,
  objSrc: PropTypes.string.isRequired,
  objPreview: PropTypes.string.isRequired
};
