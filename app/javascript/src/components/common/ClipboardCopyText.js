import React, { useCallback } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import PropTypes from 'prop-types';

import Formula from 'src/components/common/Formula';
import { copyToClipboard } from 'src/utilities/clipboard';

export default function ClipboardCopyText({ text, clipText }) {
  const copyText = clipText === '' ? text : clipText;
  const handleClick = useCallback((e) => {
    e.stopPropagation();
    copyToClipboard(copyText);
  }, [copyText]);

  return (
    <OverlayTrigger
      placement="bottom"
      overlay={<Tooltip id="copy_clipboard">copy to clipboard</Tooltip>}
    >
      <span
        role="button"
        onClick={handleClick}
      >
        {text}
      </span>
    </OverlayTrigger>
  );
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
