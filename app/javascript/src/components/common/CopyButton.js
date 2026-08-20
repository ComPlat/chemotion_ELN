import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { copyToClipboard } from 'src/utilities/clipboard';

// Icon button that copies `text` to the clipboard and briefly confirms success by
// swapping the clipboard icon for a check. Failure feedback (a toast) is handled by
// copyToClipboard itself, so callers get it for free.
const CopyButton = ({
  text, tooltip, tooltipId, placement, variant, size, disabled, className, active,
}) => {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);

  // clear the pending reset if the button unmounts before it fires
  useEffect(() => () => clearTimeout(resetTimer.current), []);

  const handleCopy = async (e) => {
    e?.stopPropagation();
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 1500);
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      className={className}
      active={active}
      onClick={handleCopy}
    >
      <i className={`fa ${copied ? 'fa-check' : 'fa-clipboard'}`} aria-hidden="true" />
    </Button>
  );

  // once copied, drop the tooltip entirely so no hover text shows during the confirmation
  if (copied) return button;

  return (
    <OverlayTrigger placement={placement} overlay={<Tooltip id={tooltipId}>{tooltip}</Tooltip>}>
      {button}
    </OverlayTrigger>
  );
};

CopyButton.propTypes = {
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  tooltip: PropTypes.node,
  tooltipId: PropTypes.string,
  placement: PropTypes.string,
  variant: PropTypes.string,
  size: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  active: PropTypes.bool,
};

CopyButton.defaultProps = {
  text: '',
  tooltip: 'copy to clipboard',
  tooltipId: 'copy-to-clipboard-tooltip',
  placement: 'top',
  variant: undefined,
  size: undefined,
  disabled: false,
  className: undefined,
  active: false,
};

export default CopyButton;
