import React, { useState } from 'react';
import { sizeAttributes } from './componentAttributes';

import { Select } from 'src/components/common/Select';

const sizes = sizeAttributes;
const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

export default {
  title: 'Components/Select',
  component: Select,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'padded',
    docs: {
      description: {
        component: `
  The Select component is a styled wrapper around the popular react-select library.
  It provides a consistent look and feel with the rest of the Chemotion ELN components.

  Please refer to the [react-select documentation](https://react-select.com/home) for a
  detailed description of the available props and usage examples.

  We provide **AsyncSelect** and **CreatableSelect** sibling components that use the same props and styling.

  **In production scenarios the usePortal prop should never be set defaulting to true.
  We introduced the parameter mainly for usage here in the Storybook documentation
  where the portal rendering causes problems in conjunction with IFrames.**
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    options: {
      control: { type: 'object' },
      description: 'Array of options to be displayed in the select dropdown. Format: [{ value: "", label: "" }, ...]',
      table: {
        type: { summary: 'array' },
        defaultValue: { summary: '[]' },
      },
    },
    placeholder: {
      control: { type: 'text' },
      description: 'Placeholder text when no option is selected',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Select...' },
      },
    },
    isClearable: {
      control: { type: 'boolean' },
      description: 'Whether the selected value can be cleared',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
      },
    },
    size: {
      control: { type: 'select' },
      options: sizes,
      description: 'Size of the select',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
      },
    },
    usePortal: {
      control: { type: 'boolean' },
      description: 'Whether to render the menu in a portal. Avoids overflow issues.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
      },
    },
  },
};

export const Default = {
  args: {
    options,
    placeholder: 'Select an option',
    isClearable: true,
    size: 'md',
    usePortal: false,
  },
};

export function Sizes() {
  const [selectedOption, setSelectedOption] = useState(null);
  return (
    <div className="d-flex mb-3 gap-3 align-items-center">
      {sizes.map((size) => (
        <Select
          name="publication"
          value={selectedOption}
          onChange={setSelectedOption}
          options={options}
          placeholder={`Select a ${size} option`}
          isClearable
          size={size}
          key={size}
          usePortal={false}
        />
      ))}
    </div>
  );
}
Sizes.parameters = {
  docs: {
    description: {
      story: `
  Given the high density of ELN UI, we extended Bootstrap's standard sizing with extra small and extra
  extra small options. Extra extra small selects should be used sparingly, large selects are not recommended at all.
      `
    }
  }
};
