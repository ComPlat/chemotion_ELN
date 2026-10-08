import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  ButtonToolbar,
  Overlay,
  Tooltip,
} from 'react-bootstrap';

const ConfirmationOverlay = ({
  overlayTarget,
  placement,
  warningText,
  destructiveAction,
  destructiveActionLabel,
  hideAction,
  hideActionLabel,
  primaryAction,
  primaryActionLabel,
  stopMouseDownPropagation,
}) => {
  // Lazy initializer so the random id is generated once on mount, not on every render.
  const [overlayId] = useState(() => `confirmation-overlay-${Math.random().toString(36).slice(2)}`);
  const hasDestructiveAction = destructiveAction && destructiveActionLabel;
  const hasHideAction = hideAction && hideActionLabel;
  const hasPrimaryAction = primaryAction && primaryActionLabel;
  // Guards a button inside a row/tree whose own onMouseDown would otherwise fire first
  // (e.g. row selection or drag start) - unrelated to the focus/blur race this overlay
  // already avoids by being driven off explicit `overlayTarget` state.
  const mouseDownProps = stopMouseDownPropagation
    ? { onMouseDown: (event) => event.stopPropagation() }
    : {};

  return (
    <Overlay
      target={overlayTarget}
      show={!!overlayTarget}
      placement={placement}
      rootClose
      onHide={hideAction || undefined}
    >
      <Tooltip id={overlayId}>
        <div className="p2">
          {warningText}
          <ButtonToolbar className="justify-content-end mt-2">
            {hasDestructiveAction && (
              <Button
                variant="danger"
                size="xsm"
                onClick={destructiveAction}
                {...mouseDownProps}
              >
                {destructiveActionLabel}
              </Button>
            )}
            {hasHideAction && (
              <Button
                variant="ghost"
                size="xsm"
                onClick={hideAction}
                {...mouseDownProps}
              >
                {hideActionLabel}
              </Button>
            )}
            {hasPrimaryAction && (
              <Button
                variant="primary"
                size="xsm"
                onClick={primaryAction}
                {...mouseDownProps}
              >
                {primaryActionLabel}
              </Button>
            )}
          </ButtonToolbar>
        </div>
      </Tooltip>
    </Overlay>
  );
};

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
  stopMouseDownPropagation: PropTypes.bool,
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
  stopMouseDownPropagation: false,
};

export default ConfirmationOverlay;
