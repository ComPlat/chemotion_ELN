import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { fn } from 'storybook/test';
import { Button } from 'react-bootstrap';

import ConfirmationOverlay from 'src/components/common/ConfirmationOverlay';

function ConfirmationOverlayDemo({
  triggerLabel,
  placement,
  warningText,
  destructiveActionLabel,
  hideActionLabel,
  primaryActionLabel,
}) {
  const [overlayTarget, setOverlayTarget] = useState(null);

  const onDestructiveAction = fn();
  const onHideAction = fn();
  const onPrimaryAction = fn();

  const toggleOverlay = (event) => {
    setOverlayTarget((prevTarget) => (prevTarget ? null : event.currentTarget));
  };

  const handleHide = () => {
    onHideAction();
    setOverlayTarget(null);
  };

  const handleDestructiveAction = () => {
    onDestructiveAction();
    setOverlayTarget(null);
  };

  const handlePrimaryAction = () => {
    onPrimaryAction();
    setOverlayTarget(null);
  };

  return (
    <>
      <Button variant="secondary" onClick={toggleOverlay}>
        {triggerLabel}
      </Button>
      <ConfirmationOverlay
        overlayTarget={overlayTarget}
        placement={placement}
        warningText={warningText}
        destructiveAction={destructiveActionLabel ? handleDestructiveAction : undefined}
        destructiveActionLabel={destructiveActionLabel}
        hideAction={hideActionLabel ? handleHide : undefined}
        hideActionLabel={hideActionLabel}
        primaryAction={primaryActionLabel ? handlePrimaryAction : undefined}
        primaryActionLabel={primaryActionLabel}
      />
    </>
  );
}

ConfirmationOverlayDemo.propTypes = {
  triggerLabel: PropTypes.string,
  placement: PropTypes.string,
  warningText: PropTypes.string,
  destructiveActionLabel: PropTypes.string,
  hideActionLabel: PropTypes.string,
  primaryActionLabel: PropTypes.string,
};

ConfirmationOverlayDemo.defaultProps = {
  triggerLabel: 'Toggle confirmation overlay',
  placement: 'bottom',
  warningText: 'Unsaved changes will be lost. Continue?',
  destructiveActionLabel: 'Discard',
  hideActionLabel: 'Cancel',
  primaryActionLabel: undefined,
};

function renderStory(args) {
  return (
    <ConfirmationOverlayDemo
      triggerLabel={args.triggerLabel}
      placement={args.placement}
      warningText={args.warningText}
      destructiveActionLabel={args.destructiveActionLabel}
      hideActionLabel={args.hideActionLabel}
      primaryActionLabel={args.primaryActionLabel}
    />
  );
}

export default {
  title: 'Organisms/ConfirmationOverlay',
  component: ConfirmationOverlay,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
ConfirmationOverlay is a lightweight confirmation prompt anchored to the triggering control.
Use it to ask for confirmation before executing destructive operations.

**Important**: Always provide at least one non-destructive action (hide or primary) to give users
an escape route. Without an alternative, users are forced to complete the destructive action after
triggering the overlay.

Supported action types:
- destructive (danger, required)
- hide/cancel (ghost, optional but recommended)
- primary (optional, for alternative confirmations like "Save and close")

Anchor the overlay to a DOM element and manage visibility by setting or clearing the overlayTarget prop.
        `,
      },
    },
  },
  argTypes: {
    triggerLabel: {
      control: 'text',
      description: 'Label of the trigger button in this story',
      table: {
        category: 'Story controls',
      },
    },
    placement: {
      control: { type: 'select' },
      options: ['top', 'right', 'bottom', 'left', 'top-start', 'top-end', 'bottom-start', 'bottom-end'],
      description: 'Overlay placement relative to the target element',
    },
    warningText: {
      control: 'text',
      description: 'Main warning message shown in the overlay',
    },
    destructiveActionLabel: {
      control: 'text',
      description: 'Label for the destructive action button (danger)',
    },
    hideActionLabel: {
      control: 'text',
      description: 'Label for the dismiss action button (ghost)',
    },
    primaryActionLabel: {
      control: 'text',
      description: 'Optional label for an additional primary action',
    },
  },
  args: {
    triggerLabel: 'Toggle confirmation overlay',
    warningText: 'Unsaved changes will be lost. Continue?',
    destructiveActionLabel: 'Discard',
    hideActionLabel: 'Cancel',
    primaryActionLabel: undefined,
  },
};

export const Default = {
  render: renderStory,
};

export const WithPrimaryAction = {
  args: {
    primaryActionLabel: 'Save and close',
    warningText: 'You have unsaved changes. Save before closing?',
  },
  render: renderStory,
};

export const PrimaryOnly = {
  args: {
    hideActionLabel: '',
    primaryActionLabel: 'Save and close',
    destructiveActionLabel: 'Discard',
    warningText: 'You have unsaved changes. Proceed without saving?',
  },
  render: renderStory,
};
