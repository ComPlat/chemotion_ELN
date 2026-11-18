import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { fn } from 'storybook/test';
import { Button } from 'react-bootstrap';

import AppModal from 'src/components/common/AppModal';
import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';

function AppModalDemo({
  title,
  body,
  editableTitle,
  notification,
  notificationType,
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
  const [currentTitle, setCurrentTitle] = useState(title);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

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
      <Button variant="light" onClick={() => setShow(true)}>
        {triggerLabel}
      </Button>
      <AppModal
        title={currentTitle}
        onChangeTitle={editableTitle ? setCurrentTitle : undefined}
        notification={notification}
        notificationType={notificationType}
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
      editableTitle={args.editableTitle}
      notification={args.notification}
      notificationType={args.notificationType}
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
  editableTitle: PropTypes.bool,
  notification: PropTypes.string,
  notificationType: PropTypes.oneOf(['warning', 'info', 'success', 'danger']),
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
  editableTitle: false,
  notification: undefined,
  notificationType: 'info',
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
  Please choose the light variant for buttons in this slot to visually separate them from the main action.

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
    editableTitle: {
      control: 'boolean',
      description: 'Render editable title input in modal header',
    },
    notification: {
      control: 'text',
      description: 'Optional notification shown in modal header',
    },
    notificationType: {
      control: { type: 'select' },
      options: ['warning', 'info', 'success', 'danger'],
      description: 'Header notification style',
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

export const EditableTitle = {
  args: {
    editableTitle: true,
    title: 'Editable Modal Title',
  },
  render: renderStory,
};

export const HeaderNotification = {
  args: {
    notification: 'Take note',
    size: 'lg',
  },
  render: renderStory,
};

export function HeaderNotificationVariants() {
  const [show, setShow] = useState(false);
  const [notificationType, setNotificationType] = useState('info');
  const [notification, setNotification] = useState('Information: check the latest updates.');

  const handleSetInfo = () => {
    setNotificationType('info');
    setNotification('Information: check the latest updates.');
    setShow(true);
  };

  const handleSetWarning = () => {
    setNotificationType('warning');
    setNotification('Warning: instrument metadata is missing.');
    setShow(true);
  };

  const handleSetSuccess = () => {
    setNotificationType('success');
    setNotification('Success: dataset validation passed.');
    setShow(true);
  };

  const handleSetDanger = () => {
    setNotificationType('danger');
    setNotification('Error: dataset import failed. Please retry.');
    setShow(true);
  };

  return (
    <div className="d-flex flex-column gap-2 align-items-start">
      <div className="d-flex gap-2">
        <Button variant="light" onClick={handleSetInfo}>Trigger info</Button>
        <Button variant="warning" onClick={handleSetWarning}>Trigger warning</Button>
        <Button variant="success" onClick={handleSetSuccess}>Trigger success</Button>
        <Button variant="danger" onClick={handleSetDanger}>Trigger danger</Button>
      </div>
      <AppModal
        title="Notification variants"
        show={show}
        size="lg"
        notificationType={notificationType}
        notification={notification}
        closeLabel="Close"
        onHide={() => setShow(false)}
      >
        <p className="mb-0">Use the buttons above to switch notification variant and text.</p>
      </AppModal>
    </div>
  );
}

HeaderNotificationVariants.parameters = {
  docs: {
    description: {
      story: 'Use the four trigger buttons to preview info, warning, success, '
        + 'and danger notifications with dedicated texts.',
    },
  },
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
      <Button variant="light" onClick={() => setShow(true)}>
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
