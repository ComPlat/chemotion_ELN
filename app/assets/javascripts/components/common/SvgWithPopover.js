import React, { Component, PropTypes } from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import SVG from 'react-inlinesvg';

export default class SvgWithPopover extends Component {
  constructor(props) {
    super(props);
    this.renderPreview = this.renderPreview.bind(this);
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

  popoverHoverFocus() {
    const { element, classNames } = this.props;
    const title = this.extractTitle(element);
    const popoverClass = classNames === 'molecule' ? 'preview-popover-fixed' : 'preview-popover';

    return (
      <div
        style={{
          position: 'absolute',
          borderRadius: 3,
          backgroundcolor: 'yellow',
          marginLeft: -30,
          marginTop: -150,
          maxWidth: 'none',
        }}
      >
        <Popover
          id="popover-trigger-hover-focus"
          title={title}
          arrowOffsetTop="120px"
          style={{
            marginLeft: '25px',
            marginTop: '-1px',
            visibility: 'visible',
            maxWidth: 'none'
          }}
        >
          <div className={popoverClass}>
            <SVG
              src={element.svgPath}
              key={element.svgPath}
            />
          </div>
        </Popover>
      </div>
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
      <div>
        <OverlayTrigger
          trigger={['hover', 'focus']}
          placement="right"
          rootClose
          onHide={null}
          overlay={this.popoverHoverFocus()}
        >
          {this.renderPreview()}
        </OverlayTrigger>
      </div>
    );
  }
}

SvgWithPopover.propTypes = {
  element: PropTypes.object.isRequired,
  classNames: PropTypes.string.isRequired,
};
