/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from 'react-bootstrap';

function AppModal({
  show,
  onHide,
  onRequestClose,
  title,
  children,
  showFooter,
  extendedFooter,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled,
  closeLabel,
  className,
  bodyClassName,
  // Modal-level props with sensible defaults
  centered,
  size,
  animation,
  enforceFocus,
  dialogClassName,
  ...rest
}) {
  const handleRequestClose = (event, source) => {
    if (onRequestClose) {
      onRequestClose(event, source);
      return;
    }

    onHide();
  };

  const shouldShowFooter = showFooter ?? (extendedFooter !== undefined || (primaryActionLabel && onPrimaryAction));

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
      <Modal.Header className="d-flex justify-content-between align-items-center">
        <Modal.Title>{title}</Modal.Title>
        <button
          type="button"
          className="btn-close"
          aria-label="Close"
          onClick={(event) => handleRequestClose(event, 'header')}
        />
      </Modal.Header>
      <Modal.Body className={bodyClassName}>
        {children}
      </Modal.Body>
      {shouldShowFooter && (
        <Modal.Footer>
          <Button variant="ghost" onClick={(event) => handleRequestClose(event, 'footer')}>
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
  /** Optional click handler for the modal close controls (receives event and source: header|footer) */
  onRequestClose: PropTypes.func,
  /** Text or element rendered inside Modal.Title */
  title: PropTypes.node.isRequired,
  /** Modal body content */
  children: PropTypes.node.isRequired,
  /** Overrides automatic footer visibility when set */
  showFooter: PropTypes.bool,
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
  /** Extra CSS class added to Modal.Body */
  bodyClassName: PropTypes.string,
  // Forwarded Modal props
  centered: PropTypes.bool,
  size: PropTypes.string,
  animation: PropTypes.bool,
  enforceFocus: PropTypes.bool,
  dialogClassName: PropTypes.string,
};

AppModal.defaultProps = {
  showFooter: undefined,
  extendedFooter: undefined,
  onRequestClose: undefined,
  primaryActionLabel: undefined,
  onPrimaryAction: undefined,
  primaryActionDisabled: false,
  closeLabel: 'Cancel',
  className: undefined,
  bodyClassName: undefined,
  centered: true,
  size: undefined,
  animation: true,
  enforceFocus: true,
  dialogClassName: undefined,
};

export default AppModal;
