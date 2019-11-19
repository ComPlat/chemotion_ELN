import React, { Component } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';
import Clipboard from 'clipboard';

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
        <div style={{ display: 'inline' }} role="button" data-clipboard-text={clipText || ' '} className="clipboardBtn" >{this.props.text}</div>
      </OverlayTrigger>
    );
  }
}

ClipboardCopyText.propTypes = {
  text: PropTypes.string.isRequired,
  clipText: PropTypes.string
};

ClipboardCopyText.defaultProps = {
  clipText: ''
};
