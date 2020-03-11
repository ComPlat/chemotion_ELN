import React, { Component } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import Clipboard from 'clipboard';

import Formula from './Formula';

export default class ClipboardCopyText extends Component {
  constructor(props) {
    super(props);
    this.clipboard = new Clipboard('.clipboardBtn');
  }

  render() {
    const clipText = this.props.clipText === '' ? this.props.text : this.props.clipText;
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="copy_clipboard">copy to clipboard</Tooltip>}
      >
        <span
          style={{ display: 'inline' }}
          role="button"
          data-clipboard-text={clipText}
          className="clipboardBtn"
        >
          {this.props.text}
        </span>
      </OverlayTrigger>
    );
  }
}

ClipboardCopyText.propTypes = {
  text: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.instanceOf(Formula),
  ]),
  clipText: PropTypes.string
};

ClipboardCopyText.defaultProps = {
  text: '',
  clipText: ''
};
