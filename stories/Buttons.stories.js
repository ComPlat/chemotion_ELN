import React from 'react';
import { fn } from 'storybook/test';
import { sizeAttributes, colorAttributes } from './componentAttributes';

import { Button } from 'react-bootstrap';

const variants = colorAttributes;
const sizes = sizeAttributes;

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: variants,
      description: 'Visual style of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'primary' },
      },
    },
    size: {
      control: { type: 'select' },
      options: sizes,
      description: 'Size of the button',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    active: {
      control: 'boolean', description: 'Active state of the button', table: { defaultValue: { summary: false } }
    },
    disabled: {
      control: 'boolean', description: 'Disabled state of the button', table: { defaultValue: { summary: false } }
    },
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#action-args
  args: { onClick: fn() },
};

export const Primary = {
  args: {
    children: 'Button',
    variant: 'primary',
    size: 'md',
  },
};

export function VariantsAndStates() {
  return (
    <>
      <p className="styleguide-label">Default state</p>
      <div className="d-flex mb-3 gap-3">
        {variants.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Button>
        ))}
      </div>
      <p className="styleguide-label">Active state</p>
      <div className="d-flex mb-3 gap-3">
        {variants.map((variant) => (
          <Button key={variant} variant={variant} active>
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Button>
        ))}
      </div>
      <p className="styleguide-label">Disabled state</p>
      <div className="d-flex mb-3 gap-3">
        {variants.map((variant) => (
          <Button key={variant} variant={variant} disabled>
            {variant.charAt(0).toUpperCase() + variant.slice(1)}
          </Button>
        ))}
      </div>
    </>
  );
}

export function Sizes() {
  return (
    <div className="d-flex mb-3 gap-3 align-items-center">
      {sizes.map((size) => (
        <Button key={size} size={size} variant="primary">
          {size.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
