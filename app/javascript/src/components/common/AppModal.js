/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';

function AppModal({
  show,
  onHide,
  title,
  children,
  extendedFooter,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled,
  closeLabel,
  className,
  // Modal-level props with sensible defaults
  centered,
  size,
  animation,
  enforceFocus,
  dialogClassName,
  ...rest
}) {
  return (
    <Modal
      centered={centered}
      size={size}
      animation={animation}
      enforceFocus={enforceFocus}
      dialogClassName={dialogClassName}
      className={`app-modal${className ? ` ${className}` : ''}`}
      show={show}
      onHide={onHide}
      {...rest}
    >
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {children}
      </Modal.Body>
      {(extendedFooter !== undefined || (primaryActionLabel && onPrimaryAction)) && (
        <Modal.Footer>
          <Button variant="ghost" onClick={onHide}>
            {closeLabel}
          </Button>
          {extendedFooter}
          {primaryActionLabel && onPrimaryAction && (
            <Button variant="primary" onClick={onPrimaryAction} disabled={primaryActionDisabled}>
              {primaryActionLabel}
            </Button>
          )}
        </Modal.Footer>
      )}
    </Modal>
  );
}

AppModal.propTypes = {
  /** Controls visibility */
  show: PropTypes.bool.isRequired,
  /** Called when the modal requests to close (backdrop click, Escape, × button) */
  onHide: PropTypes.func.isRequired,
  /** Text or element rendered inside Modal.Title */
  title: PropTypes.node.isRequired,
  /** Modal body content */
  children: PropTypes.node.isRequired,
  /** Additional footer content */
  extendedFooter: PropTypes.node,
  /** Label for the standardized primary action button */
  primaryActionLabel: PropTypes.string,
  /** Click handler for the standardized primary action button */
  onPrimaryAction: PropTypes.func,
  /** Disabled state for the standardized primary action button */
  primaryActionDisabled: PropTypes.bool,
  /** Label for the built-in close button */
  closeLabel: PropTypes.string,
  /** Extra CSS class added to the root Modal element alongside app-modal */
  className: PropTypes.string,
  // Forwarded Modal props
  centered: PropTypes.bool,
  size: PropTypes.string,
  animation: PropTypes.bool,
  enforceFocus: PropTypes.bool,
  dialogClassName: PropTypes.string,
};

AppModal.defaultProps = {
  extendedFooter: undefined,
  primaryActionLabel: undefined,
  onPrimaryAction: undefined,
  primaryActionDisabled: false,
  closeLabel: 'Cancel',
  className: undefined,
  centered: true,
  size: undefined,
  animation: true,
  enforceFocus: true,
  dialogClassName: undefined,
};

export default AppModal;
