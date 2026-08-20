import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { copyToClipboard } from 'src/utilities/clipboard';

// Icon button that copies `text` to the clipboard and briefly confirms success by
// swapping the clipboard icon for a check. Failure feedback (a toast) is handled by
// copyToClipboard itself, so callers get it for free.
const CopyButton = ({
  text, tooltip, tooltipId, placement, variant, size, disabled, className, active, ariaLabel,
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

  // the button is icon-only, so give it an accessible name for screen readers;
  // default to the tooltip text when it is a plain string
  const label = ariaLabel || (typeof tooltip === 'string' ? tooltip : 'copy to clipboard');

  return (
    // Force the tooltip hidden while copied (controlled show) rather than unmounting the
    // OverlayTrigger, so the Button is never remounted: keyboard focus and InputGroup/
    // ButtonGroup chrome stay stable during the confirmation. `undefined` restores normal
    // hover/focus behaviour.
    <OverlayTrigger
      placement={placement}
      show={copied ? false : undefined}
      overlay={<Tooltip id={tooltipId}>{tooltip}</Tooltip>}
    >
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        className={className}
        active={active}
        aria-label={label}
        onClick={handleCopy}
      >
        <i className={`fa ${copied ? 'fa-check' : 'fa-clipboard'}`} aria-hidden="true" />
      </Button>
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
  ariaLabel: PropTypes.string,
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
  ariaLabel: undefined,
};

export default CopyButton;
