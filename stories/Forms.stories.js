import React, { useState } from 'react';
import { Form, ButtonToolbar, Button } from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import { sizeAttributes } from './componentAttributes';

import {
  Title,
  Subtitle,
  Primary,
  Canvas
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
          <Primary />
          <Subtitle>Sizing</Subtitle>
          <Canvas of={Sizing} />
        </>
      ),
    },
  },
};
