import React from 'react';
import PropTypes from 'prop-types';
import { fn } from 'storybook/test';

import DetailCardButton, {
  detailFooterButton,
  detailHeaderButton,
} from 'src/apps/mydb/elements/details/DetailCardButton';

function DetailCardButtonDemo({
  label,
  iconClass,
  variant,
  disabled,
}) {
  const buttonProps = {
    onClick: fn(),
    label,
    iconClass,
    variant,
    disabled,
  };

  return (
    <div className="d-flex flex-column gap-3">
      <div className="surface-active p-3 d-flex align-items-center justify-content-between gap-2">
        <span>Header usage</span>
        {detailHeaderButton(buttonProps)}
      </div>
      <div className="surface-active p-3 d-flex align-items-center justify-content-between gap-2">
        <span>Footer usage</span>
        {detailFooterButton(buttonProps)}
      </div>
    </div>
  );
}

DetailCardButtonDemo.propTypes = {
  label: PropTypes.string.isRequired,
  iconClass: PropTypes.string,
  variant: PropTypes.string,
  disabled: PropTypes.bool,
};

DetailCardButtonDemo.defaultProps = {
  iconClass: 'fa fa-circle',
  variant: 'secondary',
  disabled: false,
};

function renderStory(args) {
  return (
    <DetailCardButtonDemo
      label={args.label}
      iconClass={args.iconClass}
      variant={args.variant}
      disabled={args.disabled}
    />
  );
}

export default {
  title: 'Molecules/DetailCardButton',
  component: DetailCardButton,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: `
DetailCardButton is the shared action button format for DetailCard toolbars.

Use the helper functions instead of wiring the header/footer modes manually:
- detailHeaderButton(buttonProps): compact icon-only action with tooltip
- detailFooterButton(buttonProps): full button with icon and label

This lets the same button props be repeated in header and footer.
        `,
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Accessible label and footer button text',
    },
    iconClass: {
      control: 'text',
      description: 'Icon class rendered in header and footer variants',
    },
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'warning', 'light', 'success'],
      description: 'Bootstrap button variant',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable both header and footer button renderings',
    },
  },
  args: {
    label: 'Generate',
    iconClass: 'fa fa-caret-square-o-right',
    variant: 'primary',
    disabled: false,
  },
};

export const Default = {
  render: renderStory,
};

export const SecondaryAction = {
  args: {
    label: 'Reset',
    iconClass: 'fa fa-undo',
    variant: 'secondary',
  },
  render: renderStory,
};

export const Disabled = {
  args: {
    disabled: true,
  },
  render: renderStory,
};
