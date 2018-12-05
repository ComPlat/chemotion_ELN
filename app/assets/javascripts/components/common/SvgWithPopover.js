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
    const { objTitle, objSrc, settingPreviewPop } = this.props;
    const preHeight = settingPreviewPop.height;
    const preWidth = settingPreviewPop.width;
    return (
      <Popover
        id="popover-trigger-hover-focus"
        title={objTitle}
        style={{ maxWidth: 'none', maxHeight: 'none' }}
      >
        <img src={objSrc} style={{ height: preHeight, width: preWidth }} alt="" />
      </Popover>
    );
  }

  renderPreview() {
    const { objSrc, settingPreviewPop } = this.props;
    let previewObj = settingPreviewPop.content;
    if (previewObj === '') {
      previewObj = (
        settingPreviewPop.isSVG ?
          <SVG src={objSrc} className="molecule" key={objSrc} />
          :
          <img src={objSrc} alt="" />
      );
    }

    return (
      <div className="preview-table">
        {previewObj}
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
  settingPreviewPop: PropTypes.shape({
    content: PropTypes.string,
    isSVG: PropTypes.bool,
    height: PropTypes.string,
    width: PropTypes.string,
  })
};

SvgWithPopover.defaultProps = {
  settingPreviewPop: {
    content: '',
    isSVG: true,
    height: '26vh',
    width: '52vw',
  }
};
