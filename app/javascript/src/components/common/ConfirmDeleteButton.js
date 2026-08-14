import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Overlay, OverlayTrigger, Popover, Tooltip,
} from 'react-bootstrap';

// Confirmation popover for a destructive action, opened/closed by explicit component state
// instead of `OverlayTrigger`'s focus/blur. A focus-triggered popover hides as soon as its
// trigger button blurs, and clicking a button inside the popover blurs the trigger before
// that button's own click event fires - so "Yes" can silently do nothing. That race caused
// https://github.com/ComPlat/chemotion_ELN/issues/2835.
const ConfirmDeleteButton = ({
  id,
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
        <OverlayTrigger placement="top" overlay={<Tooltip id={`${id}-tooltip`}>{tooltip}</Tooltip>}>
          {triggerButton}
        </OverlayTrigger>
      ) : triggerButton}
      <Overlay show={!!target} target={target} placement={placement} rootClose onHide={close}>
        <Popover id={id}>
          <Popover.Header as="h5">{header}</Popover.Header>
          <Popover.Body>
            <div className="d-flex gap-2">
              <Button size="sm" variant="danger" onClick={confirm} {...mouseDownProps}>
                Yes
              </Button>
              <Button size="sm" variant="warning" onClick={close} {...mouseDownProps}>
                No
              </Button>
            </div>
          </Popover.Body>
        </Popover>
      </Overlay>
    </>
  );
};

ConfirmDeleteButton.propTypes = {
  id: PropTypes.string.isRequired,
  header: PropTypes.node.isRequired,
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
