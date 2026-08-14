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
  stopMouseDownPropagation,
  children,
}) => {
  const [target, setTarget] = useState(null);
  // Lazy initializer so the random id is generated once on mount, not on every render.
  const [tooltipId] = useState(() => `confirm-delete-tooltip-${Math.random().toString(36).slice(2)}`);

  const mouseDownProps = stopMouseDownPropagation
    ? { onMouseDown: (event) => event.stopPropagation() }
    : {};

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
        <OverlayTrigger placement="top" overlay={<Tooltip id={tooltipId}>{tooltip}</Tooltip>}>
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
        stopMouseDownPropagation={stopMouseDownPropagation}
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
  stopMouseDownPropagation: PropTypes.bool,
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
  stopMouseDownPropagation: false,
  children: <i className="fa fa-trash-o" />,
};

export default ConfirmDeleteButton;
