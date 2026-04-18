import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ButtonToolbar,
  Overlay,
  Tooltip,
} from 'react-bootstrap';

export default function ConfirmationOverlay({
  overlayTarget,
  placement,
  warningText,
  destructiveAction,
  destructiveActionLabel,
  hideAction,
  hideActionLabel,
  primaryAction,
  primaryActionLabel,
}) {
  const overlayIdRef = useRef(`confirmation-overlay-${Math.random().toString(36).slice(2)}`);
  const hasDestructiveAction = destructiveAction && destructiveActionLabel;
  const hasHideAction = hideAction && hideActionLabel;
  const hasPrimaryAction = primaryAction && primaryActionLabel;

  return (
    <Overlay
      target={overlayTarget}
      show={!!overlayTarget}
      placement={placement}
      rootClose
      onHide={hideAction || undefined}
    >
      <Tooltip id={overlayIdRef.current}>
        <div className="p2">
          {warningText}
          <ButtonToolbar className="justify-content-end mt-2">
            {hasDestructiveAction && (
              <Button
                variant="danger"
                size="xsm"
                onClick={destructiveAction}
              >
                {destructiveActionLabel}
              </Button>
            )}
            {hasHideAction && (
              <Button
                variant="ghost"
                size="xsm"
                onClick={hideAction}
              >
                {hideActionLabel}
              </Button>
            )}
            {hasPrimaryAction && (
              <Button
                variant="primary"
                size="xsm"
                onClick={primaryAction}
              >
                {primaryActionLabel}
              </Button>
            )}
          </ButtonToolbar>
        </div>
      </Tooltip>
    </Overlay>
  );
}

ConfirmationOverlay.propTypes = {
  overlayTarget: PropTypes.oneOfType([
    PropTypes.shape({}),
    PropTypes.func,
  ]),
  placement: PropTypes.string,
  warningText: PropTypes.string.isRequired,
  destructiveAction: PropTypes.func,
  destructiveActionLabel: PropTypes.string,
  hideAction: PropTypes.func,
  hideActionLabel: PropTypes.string,
  primaryAction: PropTypes.func,
  primaryActionLabel: PropTypes.string,
};

ConfirmationOverlay.defaultProps = {
  overlayTarget: null,
  placement: 'bottom',
  destructiveAction: undefined,
  destructiveActionLabel: undefined,
  hideAction: undefined,
  hideActionLabel: undefined,
  primaryAction: undefined,
  primaryActionLabel: undefined,
};
