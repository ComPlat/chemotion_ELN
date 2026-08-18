import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';
import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';

// A self-contained trigger button for ConfirmationOverlay's "click, then confirm in a
// popover" idiom: it owns the button and the open/closed state itself, so call sites don't
// each have to wire up their own ref + target state for the common case of "one button
// opens one confirm popover". The actual popover (and the explicit-state-over-focus/blur
// fix for https://github.com/ComPlat/chemotion_ELN/issues/2835) is ConfirmationOverlay's.
const ConfirmDeleteButton = ({
  header,
  onConfirm,
  tooltip,
  placement,
  size,
  variant,
  className,
  title,
  disabled,
  children,
}) => {
  const [target, setTarget] = useState(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  // Lazy initializer so the random id is generated once on mount, not on every render.
  const [tooltipId] = useState(() => `confirm-delete-tooltip-${Math.random().toString(36).slice(2)}`);

  // Always on, not opt-in: this is meant to be embeddable inline in list/tree rows, exactly
  // where an ancestor's own mousedown handler (row selection, drag-and-drop) is most likely
  // to steal the mousedown before the click fires - the same failure class as #2835, just via
  // a different mechanism. Making a future caller remember to opt in would just reintroduce it.
  const mouseDownProps = { onMouseDown: (event) => event.stopPropagation() };

  const close = () => setTarget(null);
  const confirm = () => {
    close();
    onConfirm();
  };

  const triggerButton = (
    <Button
      size={size}
      type="button"
      variant={variant}
      className={className}
      title={title}
      disabled={disabled}
      onClick={(event) => setTarget((current) => (current ? null : event.currentTarget))}
      {...mouseDownProps}
    >
      {children}
    </Button>
  );

  return (
    <>
      {tooltip ? (
        // Controlled `show` (gated on `!target`) rather than the default hover/focus state:
        // clicking the trigger also focuses it (Chromium/Windows), which would otherwise pop
        // this tooltip open at the same time as the confirm popover, stacked over the same
        // button. `onToggle` still drives it normally (hover and plain keyboard focus both
        // work) - it's only forced shut while the confirm popover itself is open.
        <OverlayTrigger
          placement="top"
          show={tooltipVisible && !target}
          onToggle={setTooltipVisible}
          overlay={<Tooltip id={tooltipId}>{tooltip}</Tooltip>}
        >
          {triggerButton}
        </OverlayTrigger>
      ) : triggerButton}
      <ConfirmationOverlay
        overlayTarget={target}
        placement={placement}
        warningText={header}
        destructiveAction={confirm}
        destructiveActionLabel="Yes"
        hideAction={close}
        hideActionLabel="No"
        stopMouseDownPropagation
      />
    </>
  );
};

ConfirmDeleteButton.propTypes = {
  header: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  tooltip: PropTypes.node,
  placement: PropTypes.string,
  size: PropTypes.string,
  variant: PropTypes.string,
  className: PropTypes.string,
  title: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.node,
};

ConfirmDeleteButton.defaultProps = {
  tooltip: null,
  placement: 'right',
  size: 'sm',
  variant: 'danger',
  className: undefined,
  title: undefined,
  disabled: false,
  children: <i className="fa fa-trash-o" />,
};

export default ConfirmDeleteButton;
