import React, { Component } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

import Formula from 'src/components/common/Formula';
import { copyToClipboard } from 'src/utilities/clipboard';

export default class ClipboardCopyText extends Component {
  render() {
    const { clipText, text } = this.props;
    const copyText = clipText === '' ? text : clipText;
    return (
      <OverlayTrigger
        placement="bottom"
        overlay={<Tooltip id="copy_clipboard">copy to clipboard</Tooltip>}
      >
        <span
          role="button"
          onClick={() => copyToClipboard(copyText)}
          className="d-inline"
        >
          {text}
        </span>
      </OverlayTrigger>
    );
  }
}

ClipboardCopyText.propTypes = {
  text: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      type: PropTypes.oneOf([Formula])
    }),
  ]),
  clipText: PropTypes.string
};

ClipboardCopyText.defaultProps = {
  text: '',
  clipText: ''
};
