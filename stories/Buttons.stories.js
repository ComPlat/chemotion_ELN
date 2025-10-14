import React from 'react';
import { fn } from 'storybook/test';
import { sizeAttributes } from './componentAttributes';

import { Button } from 'react-bootstrap';

const sizes = sizeAttributes;

const renderVariantsAndStates = (variantList) => (
  <>
    {variantList.map((variant) => (
      <div key={variant.name} className="d-flex mb-3 justify-content-start align-items-center gap-2">
        <div className="w-25">
          <strong>Usage:</strong>
          &nbsp;
          {variant.label}
          <br />
          <strong>Variant:</strong>
          &nbsp;
          {variant.name}
        </div>
        <div>
          <Button variant={variant.name}>Default</Button>
        </div>
        <div>
          <Button variant={variant.name} active>Active</Button>
        </div>
        <div>
          <Button variant={variant.name} disabled>Disabled</Button>
        </div>
      </div>
    ))}
  </>
);

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
    docs: {
      description: {
        component: `
  The ELN is dense with functionality and the amount of buttons the user is confronted with can be overwhelming.
  Therefore it is important to make the function and context of buttons as clear as possible.

  Please take the following guidelines into account when using buttons in the ELN:

  **Labels**: Use clear and concise labels whenever the space allows for it. 
  Make sure to keep the wording consistent throughout the application.

  **Placement & Context**: The placement of the button is critical for the assumptions the user makes about its 
  function. Buttons should always be located in direct proximity to the elements they affect. Actions that should 
  be performed after the interaction with a certain object (e.g. saving a form) should be placed below or to the 
  right. Actions that are typically performed before the interaction with a certain object (e.g. filtering of a 
  list) should be placed above or to the left.

  **Icons**: Icon-only buttons are potentially problematic as they can be ambiguous and are often interpreted
  differently by different users. If you do use icons, make sure to stay consistent with similar functions and
  provide a tooltip that explains their function.
        `
      }
    }
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['light', 'primary', 'success', 'danger'],
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

export const Light = {
  args: {
    children: 'Button',
    variant: 'light',
    size: 'md',
  },
};
Light.parameters = {
  docs: {
    description: {
      story: `
  The light button is our default choice for most actions, providing good readability without being overly
  prominent.
  `
    }
  }
};

export function Sizes() {
  return (
    <div className="d-flex mb-3 gap-3 align-items-center">
      {sizes.map((size) => (
        <Button key={size} size={size} variant="light">
          {size.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
Sizes.parameters = {
  docs: {
    description: {
      story: `
  Given the high density of ELN UI, we extended Bootstrap's standard sizing with extra small and extra
  extra small options. Extra extra small buttons should be used sparingly, large buttons are not recommended at all.
      `
    }
  }
};

export function ButtonVariants() {
  return renderVariantsAndStates(
    [{ name: 'light', label: 'Default' }, { name: 'primary', label: 'Main Action' }],
  );
}
ButtonVariants.parameters = {
  layout: 'padded',
  docs: {
    description: {
      story: `
  **Currently the built in bootstrap color variants are excessively overused throughout the code base. This is generally
  not helpful as the subjective and inconsistent use of color does not convey a clear meaning to the user.**

  With the exeption of create and destroy bottons (see semantic variants below) we recommend to stick to the
  following two variants:<br />
  The **light** variant is our default choice for most actions, providing good readability without being overly
  prominent.<br />
  Use **primary** variant is to be used for the main function within the given context (e.g. the submit or save
  button in a form).

  **Note**: When no variant is specified, Bootstrap defaults to the primary variant. However, in our design system we
  prefer to use the light variant as the default. Therefore, we recommend to explicitly set the variant to light
  unless there is a specific reason to use primary.
      `
    }
  }
};

export function SemanticVariants() {
  return renderVariantsAndStates(
    [{ name: 'success', label: 'Add' }, { name: 'danger', label: 'Delete' }]
  );
}
SemanticVariants.parameters = {
  layout: 'padded',
  docs: {
    description: {
      story: `
  The **success** variant is reserved for actions that add or create something (e.g. adding a new entry to a list,
  creating a new item, etc.).<br />
  **In the context of forms the submit action should not use the success variant.**<br />
  The general scheme for form buttons that dictates the use of the primary variant takes precedence.

  The **danger** variant is reserved for actions that delete or remove something (e.g. deleting an entry from a list,
  removing an item, etc.).<br />
  **Cancel actions or close buttons in modals and alerts should not use the danger variant, as they do not delete
  anything.**
      `
    }
  }
};

export function DeprecatedVariants() {
  return renderVariantsAndStates(
    [
      { name: 'secondary', label: 'Deprecated' },
      { name: 'warning', label: 'Deprecated' },
      { name: 'info', label: 'Deprecated' }
    ]
  );
}
DeprecatedVariants.parameters = {
  layout: 'padded',
  docs: {
    description: {
      story: `
  The **secondary**, **warning** and **info** variants are built in Bootstrap variants but are not recommended
  for buttons. As mentioned above these colors do not convey a clear meaning to the user. Please remove these
  variants from existing buttons and avoid using them in new code.

  **Secondary**, **warning** and **info** variants or helper-classes might still be used for other components
  such as badges and alerts where they are more appropriate.
      `
    }
  }
};
