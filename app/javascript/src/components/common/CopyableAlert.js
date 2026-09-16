import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { copyTextToClipboard } from 'src/utilities/clipboard';

// Status alerts often carry the one thing a user needs to pass on verbatim — a
// provider error body, an endpoint, a stack-ish message. Selecting it by hand
// inside a dismissible alert is fiddly, so every alert gets a copy button next
// to its close button.
//
// Both buttons are rendered here rather than using Alert's own `dismissible`
// close button: that one is a bare glyph on the alert's own background, and the
// two would not look like a pair. `variant="light"` plus an explicit border
// keeps them legible against the tinted background of any alert variant.

// Flatten a React subtree to the text a human would read, so the copy button
// works for alerts whose body is markup rather than a plain string.
const extractText = (node) => {
  if (node === null || node === undefined || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props && node.props.children) return extractText(node.props.children);
  return '';
};

const COPY_ICONS = {
  idle:   'fa fa-clipboard',
  copied: 'fa fa-check',
  failed: 'fa fa-exclamation-triangle',
};

const COPY_LABELS = {
  idle:   'Copy message',
  copied: 'Copied',
  failed: 'Copy failed — press Ctrl+C',
};

const CopyableAlert = ({
  variant, copyText, onClose, className, children, ...alertProps
}) => {
  const [copyState, setCopyState] = useState('idle');

  const handleCopy = async () => {
    const text = copyText === null ? extractText(children) : copyText;
    const ok = await copyTextToClipboard(text);
    setCopyState(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyState('idle'), 2000);
  };

  const buttonClass = 'border border-secondary-subtle d-inline-flex align-items-center justify-content-center';

  return (
    <Alert
      variant={variant}
      className={`d-flex align-items-start gap-2 ${className}`}
      {...alertProps}
    >
      {/* minWidth:0 lets a long, unbroken error string wrap instead of pushing
          the buttons out of the alert. */}
      <div className="flex-grow-1 text-break" style={{ minWidth: 0 }}>{children}</div>
      <div className="d-flex gap-1 flex-shrink-0">
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip id="copyable-alert-copy">{COPY_LABELS[copyState]}</Tooltip>}
        >
          <Button
            size="sm"
            variant="light"
            className={buttonClass}
            onClick={handleCopy}
            aria-label={COPY_LABELS[copyState]}
          >
            <i className={COPY_ICONS[copyState]} />
          </Button>
        </OverlayTrigger>
        {onClose && (
          <Button
            size="sm"
            variant="light"
            className={buttonClass}
            onClick={onClose}
            aria-label="Close"
          >
            <i className="fa fa-times" />
          </Button>
        )}
      </div>
    </Alert>
  );
};

CopyableAlert.propTypes = {
  variant:  PropTypes.string,
  // Text put on the clipboard; defaults to the rendered text of `children`.
  copyText: PropTypes.string,
  // Omit to render an alert that cannot be dismissed (copy button only).
  onClose:  PropTypes.func,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

CopyableAlert.defaultProps = {
  variant:   'info',
  copyText:  null,
  onClose:   null,
  className: '',
};

export default CopyableAlert;
