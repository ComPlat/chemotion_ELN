import React, { useState } from 'react';
import { Form, ButtonToolbar, Button } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import { sizeAttributes } from './componentAttributes';

import {
  Title,
  Subtitle,
  Primary,
  Canvas,
  Markdown,
} from '@storybook/blocks';

const sizes = sizeAttributes;
const options = [
  { value: 'periodical', label: 'Periodical Mails' },
  { value: 'announcements', label: 'Announcements' },
  { value: 'none', label: 'None' }
];

export function Layout() {
  const [selectedOption, setSelectedOption] = useState(null);
  return (
    <Form>
      <Form.Group className="mb-3">
        <Form.Label>Publication</Form.Label>
        <Select
          name="publication"
          value={selectedOption}
          onChange={setSelectedOption}
          options={options}
          placeholder="Select a Publication"
        />
      </Form.Group>
      <div className="row mb-3">
        <Form.Group className="col" controlId="formBasicEmail">
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" placeholder="Enter email" />
          <Form.Text className="text-muted">
            We will never share your email with anyone else.
          </Form.Text>
        </Form.Group>
        <Form.Group className="col" controlId="formBasicPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" placeholder="Password" />
        </Form.Group>
      </div>
      <Form.Group className="mb-3" controlId="formBasicCheckbox">
        <Form.Check type="checkbox" label="Check me out" />
      </Form.Group>
      <ButtonToolbar className="gap-3 justify-content-end">
        <Button variant="light">Cancel</Button>
        <Button>Save</Button>
      </ButtonToolbar>
    </Form>
  );
}

export function Sizing() {
  const [selectedOption, setSelectedOption] = useState(null);

  return (
    <div className="row">
      {sizes.map((size) => (
        <Form key={size} className="col">
          <h4 className="mb-3">
            Size:&nbsp;
            {size}
          </h4>
          <Form.Group className="mb-3">
            <Form.Label>Publication</Form.Label>
            <Select
              name="publication"
              value={selectedOption}
              onChange={setSelectedOption}
              options={options}
              placeholder="Select"
              size={size}
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId={`formPassword-${size}`}>
            <Form.Label>Password</Form.Label>
            <Form.Control size={size} type="password" placeholder="Password" />
          </Form.Group>
          <div className="d-flex justify-content-end">
            <Button size={size}>Save</Button>
          </div>
        </Form>
      ))}
    </div>
  );
}

export default {
  title: 'Design Principles/Forms',
  tags: ['autodocs'],
  parameters: {
    options: {
      storySort: {
        order: ['Layout', 'Sizing'],
      },
    },
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle>Layout</Subtitle>
          <Markdown>
            {`
  Some best practices for layouting forms in the ELN:

  - keep vertical spacing consistent
    - the \`mb-3\` helper class provides good rhythm for most cases
  - group related fields in a row
    - often it is more effective to apply the grid classes
    (\`row\` and \`col\`) directly than to import the dedicated grid components
  - use the ButtonToolbar component to contain the form actions
    - \`justify-content-end\` and \`gap-3\` provide good default alignment and spacing
  - use the light button variant for secondary actions like "Cancel"
  - use the primary button variant for the main action like "Save"
            `}
          </Markdown>
          <Primary />
          <Subtitle>Sizing</Subtitle>
          <Markdown>
            {`
  Given the high density of ELN UI, we extended Bootstrap's standard sizing with extra small and extra
  extra small options.
  
  Extra extra small form elements should be used sparingly, large form elements
  are not recommended at all.
  
  Avoid mixing sizes within a form, unless you want to emphasize a particular hierarchy.
            `}
          </Markdown>
          <Canvas of={Sizing} />
        </>
      ),
    },
  },
};
