import React from 'react';
import {
  Container, Tabs, Tab, Button, Form
} from 'react-bootstrap';

function Styleguide() {
  const renderTypography = () => (
    <div>
      <h2>Typography</h2>
      <h1>Heading 1</h1>
      <h2>Heading 2</h2>
      <h3>Heading 3</h3>
      <h4>Heading 4</h4>
      <h5>Heading 5</h5>
      <h6>Heading 6</h6>
      <p>
        This is a paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas non commodo nisi.
        Vestibulum pretium tellus id fermentum sodales. Pellentesque habitant morbi tristique senectus et netus et
        malesuada fames ac turpis egestas. Curabitur venenatis libero ut quam aliquam dictum. Nullam at iaculis
        tellus. Curabitur et erat mollis, maximus sem et, pulvinar felis.
      </p>
      <ul>
        <li>First item in unsorted list.</li>
        <li>Second item in unsorted list.</li>
        <li>Third item in unsorted list.</li>
        <li>Fourth item in unsorted list.</li>
      </ul>
      <ol>
        <li>First item in sorted list.</li>
        <li>Second item in sorted list.</li>
        <li>Third item in sorted list.</li>
        <li>Fourth item in sorted list.</li>
      </ol>
      <p>
        This paragraph contains a
        <a href="https://chemotion.net/" targert="_blank">link</a>
        to another page.
      </p>
      <p>
        You can use the mark tag to
        <mark>highlight</mark>
        text.
      </p>
      <p><del>This line of text is meant to be treated as deleted text.</del></p>
      <p><s>This line of text is meant to be treated as no longer accurate.</s></p>
      <p><ins>This line of text is meant to be treated as an addition to the document.</ins></p>
      <p><u>This line of text will render as underlined.</u></p>
      <p><small>This line of text is meant to be treated as fine print.</small></p>
      <p><strong>This line rendered as bold text.</strong></p>
      <p><em>This line rendered as italicized text.</em></p>
    </div>
  );

  const renderButtons = () => (
    <div>
      <h2>Buttons</h2>
      <p className="styleguide-label">Default state</p>
      <div className="d-flex mb-3 gap-3">
        <Button variant="primary">primary Button</Button>
        <Button variant="secondary">secondary Button</Button>
        <Button variant="knock-out">knock-out Button</Button>
      </div>
      <p className="styleguide-label">Active state</p>
      <div className="d-flex mb-3 gap-3">
        <Button variant="primary" active>primary Button</Button>
        <Button variant="secondary" active>secondary Button</Button>
        <Button variant="knock-out" active>knock-out Button</Button>
      </div>
      <p className="styleguide-label">Disabled state</p>
      <div className="d-flex mb-3 gap-3">
        <Button variant="primary" disabled>primary Button</Button>
        <Button variant="secondary" disabled>secondary Button</Button>
        <Button variant="knock-out" disabled>knock-out Button</Button>
      </div>
    </div>
  );

  const renderForms = () => (
    <div>
      <h2>Forms</h2>
      <Form>
        <Form.Group className="mb-3" controlId="formBasicEmail">
          <Form.Label>Email address</Form.Label>
          <Form.Control type="email" placeholder="Enter email" />
          <Form.Text className="text-muted">
            We&apos;ll never share your email with anyone else.
          </Form.Text>
        </Form.Group>

        <Form.Group className="mb-3" controlId="formBasicPassword">
          <Form.Label>Password</Form.Label>
          <Form.Control type="password" placeholder="Password" />
        </Form.Group>
        <Form.Group className="mb-3" controlId="formBasicCheckbox">
          <Form.Check type="checkbox" label="Check me out" />
        </Form.Group>
        <Button variant="primary" type="submit">
          Submit
        </Button>
      </Form>
    </div>
  );

  return (
    <Container className="my-3">
      <h1>ChemStrap Styleguide</h1>
      <Tabs defaultActiveKey={0} id="collection-management-tab" className="surface-tabs">
        <Tab eventKey={0} title="Typography">{renderTypography()}</Tab>
        <Tab eventKey={1} title="Buttons">{renderButtons()}</Tab>
        <Tab eventKey={2} title="Forms">{renderForms()}</Tab>
      </Tabs>
    </Container>
  );
}

export default Styleguide;
