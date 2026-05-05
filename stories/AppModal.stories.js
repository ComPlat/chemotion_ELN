import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { fn } from 'storybook/test';
import { Button } from 'react-bootstrap';

import AppModal from 'src/components/common/AppModal';
import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';

function AppModalDemo({
  title,
  body,
  triggerLabel,
  showFooter,
  extendedFooter,
  primaryActionLabel,
  primaryActionDisabled,
  closeLabel,
  centered,
  size,
  animation,
  enforceFocus,
  dialogClassName,
  className,
  bodyClassName,
  onHide,
  onRequestClose,
  onPrimaryAction,
}) {
  const [show, setShow] = useState(false);

  const handleHide = () => {
    setShow(false);
    if (onHide) onHide();
  };

  const handleRequestClose = (event, source) => {
    if (onRequestClose) onRequestClose(event, source);
    setShow(false);
  };

  const handlePrimaryAction = () => {
    if (onPrimaryAction) onPrimaryAction();
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setShow(true)}>
        {triggerLabel}
      </Button>
      <AppModal
        title={title}
        show={show}
        showFooter={showFooter}
        extendedFooter={extendedFooter}
        primaryActionLabel={primaryActionLabel}
        primaryActionDisabled={primaryActionDisabled}
        closeLabel={closeLabel}
        centered={centered}
        size={size}
        animation={animation}
        enforceFocus={enforceFocus}
        dialogClassName={dialogClassName}
        className={className}
        bodyClassName={bodyClassName}
        onHide={handleHide}
        onRequestClose={onRequestClose ? handleRequestClose : undefined}
        onPrimaryAction={onPrimaryAction ? handlePrimaryAction : undefined}
      >
        <p className="mb-0">{body}</p>
      </AppModal>
    </>
  );
}

function renderStory(args) {
  return (
    <AppModalDemo
      title={args.title}
      body={args.body}
      triggerLabel={args.triggerLabel}
      showFooter={args.showFooter}
      extendedFooter={args.extendedFooter}
      primaryActionLabel={args.primaryActionLabel}
      primaryActionDisabled={args.primaryActionDisabled}
      closeLabel={args.closeLabel}
      centered={args.centered}
      size={args.size}
      animation={args.animation}
      enforceFocus={args.enforceFocus}
      dialogClassName={args.dialogClassName}
      className={args.className}
      bodyClassName={args.bodyClassName}
      onHide={args.onHide}
      onRequestClose={args.onRequestClose}
      onPrimaryAction={args.onPrimaryAction}
    />
  );
}

AppModalDemo.propTypes = {
  title: PropTypes.node.isRequired,
  body: PropTypes.string.isRequired,
  triggerLabel: PropTypes.string.isRequired,
  showFooter: PropTypes.bool,
  extendedFooter: PropTypes.node,
  primaryActionLabel: PropTypes.string,
  primaryActionDisabled: PropTypes.bool,
  closeLabel: PropTypes.string,
  centered: PropTypes.bool,
  size: PropTypes.string,
  animation: PropTypes.bool,
  enforceFocus: PropTypes.bool,
  dialogClassName: PropTypes.string,
  className: PropTypes.string,
  bodyClassName: PropTypes.string,
  onHide: PropTypes.func,
  onRequestClose: PropTypes.func,
  onPrimaryAction: PropTypes.func,
};

AppModalDemo.defaultProps = {
  showFooter: undefined,
  extendedFooter: undefined,
  primaryActionLabel: undefined,
  primaryActionDisabled: false,
  closeLabel: 'Cancel',
  centered: true,
  size: undefined,
  animation: true,
  enforceFocus: true,
  dialogClassName: undefined,
  className: undefined,
  bodyClassName: undefined,
  onHide: undefined,
  onRequestClose: undefined,
  onPrimaryAction: undefined,
};

export default {
  title: 'Organisms/AppModal',
  component: AppModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
A standardized wrapper around react-bootstrap Modal with Chemotion defaults for header,
close behavior, and optional footer actions.

AppModal helps to establish a consistent footer button pattern:
- It places cancel/close actions on the left with a small extra gap, and applies the same
  variant as the header close button (x).
- Most modals have one primary task. AppModal places the primary action button (variant primary)
  on the far right as the last button.
- It provides an extra slot for additional actions and places them between cancel and primary.
  Please choose the secondary variant for buttons in this slot to visually separate them from the main action.

More info about button variants: [Button variants](?path=/docs/atoms-button--docs#button-variants-5).
        `,
      },
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'Modal title',
    },
    body: {
      control: 'text',
      description: 'Body text used by this story wrapper',
      table: {
        category: 'Story controls',
      },
    },
    triggerLabel: {
      control: 'text',
      description: 'Label for the button that opens the modal in Storybook',
      table: {
        category: 'Story controls',
      },
    },
    showFooter: {
      control: 'boolean',
      description: 'Toggle footer visibility explicitly',
    },
    primaryActionLabel: {
      control: 'text',
      description: 'Label for the primary footer action',
    },
    primaryActionDisabled: {
      control: 'boolean',
      description: 'Disable primary footer action',
    },
    closeLabel: {
      control: 'text',
      description: 'Label for the built-in close/cancel action',
    },
    centered: {
      control: 'boolean',
      description: 'Center dialog vertically',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'lg', 'xl'],
      description: 'Dialog size forwarded to react-bootstrap Modal',
    },
    animation: {
      control: 'boolean',
      description: 'Enable fade animation',
    },
    enforceFocus: {
      control: 'boolean',
      description: 'Keep focus trapped inside modal while open',
    },
  },
  args: {
    title: 'Example Modal',
    body: 'Use this component to provide consistent modal structure across the app.',
    triggerLabel: 'Open AppModal',
    showFooter: true,
    closeLabel: 'Cancel',
    centered: true,
    animation: true,
    enforceFocus: true,
    onHide: fn(),
    onRequestClose: fn(),
  },
};

export const Default = {
  render: renderStory,
};

export const WithPrimaryAction = {
  args: {
    primaryActionLabel: 'Save',
    onPrimaryAction: fn(),
  },
  render: renderStory,
};

export const WithoutFooter = {
  args: {
    showFooter: false,
  },
  render: renderStory,
};

export const WithExtendedFooter = {
  args: {
    showFooter: true,
    extendedFooter: <Button variant="light">Secondary action</Button>,
    primaryActionLabel: 'Confirm',
    onPrimaryAction: fn(),
  },
  render: renderStory,
};

export const Large = {
  args: {
    size: 'lg',
    title: 'Large Modal',
  },
  render: renderStory,
};

export function CloseWithConfirmationOverlay() {
  const [show, setShow] = useState(false);
  const [closeOverlayTarget, setCloseOverlayTarget] = useState(null);
  const [closeOverlayPlacement, setCloseOverlayPlacement] = useState('top');
  const onBogusSaveAndClose = fn();

  const handleRequestClose = (event, source) => {
    setCloseOverlayTarget(event.currentTarget);
    setCloseOverlayPlacement(source === 'header' ? 'bottom' : 'top');
  };

  const handleKeepEditing = () => {
    setCloseOverlayTarget(null);
  };

  const handleConfirmClose = () => {
    setCloseOverlayTarget(null);
    setShow(false);
  };

  const handleBogusSaveAndClose = () => {
    onBogusSaveAndClose();
    setCloseOverlayTarget(null);
    setShow(false);
  };

  const handleHide = () => {
    setCloseOverlayTarget(null);
    setShow(false);
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setShow(true)}>
        Open modal with close confirmation
      </Button>
      <AppModal
        title="Unsaved changes"
        show={show}
        closeLabel="Close"
        onHide={handleHide}
        onRequestClose={handleRequestClose}
        backdrop="static"
        keyboard={false}
        primaryActionLabel="Save"
        onPrimaryAction={fn()}
      >
        <p className="mb-0">
          This example asks for confirmation when the user clicks the header or footer close action.
        </p>
      </AppModal>
      <ConfirmationOverlay
        overlayTarget={closeOverlayTarget}
        placement={closeOverlayPlacement}
        warningText="You have unsaved changes. Save before closing?"
        destructiveAction={handleConfirmClose}
        destructiveActionLabel="Discard"
        hideAction={handleKeepEditing}
        hideActionLabel="Cancel"
        primaryAction={handleBogusSaveAndClose}
        primaryActionLabel="Save and close"
      />
    </>
  );
}

CloseWithConfirmationOverlay.parameters = {
  docs: {
    description: {
      story: `
Intercept close requests using \`onRequestClose\` and show a
[ConfirmationOverlay](?path=/docs/organisms-confirmationoverlay--docs) anchored to the clicked close control.
      `,
    },
  },
};
