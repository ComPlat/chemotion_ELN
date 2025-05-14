import React from 'react';
import {
  Container, Tabs, Tab, Button, Form
} from 'react-bootstrap';

function Styleguide() {
  const renderStyleguideCard = (title, content) => (
    <div>
      <div className="surface-tab__header">
        <h2>{title}</h2>
      </div>
      <div className="surface-tab__text-content">
        {content}
      </div>
    </div>
  );

  const renderTypography = () => (
    renderStyleguideCard(
      'Typography',
      <>
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
          This paragraph contains a&nbsp;
          <a href="https://chemotion.net/" targert="_blank">link</a>
          &nbsp;to another page.
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
      </>
    )
  );

  const renderColorCard = (name, application) => (
    <div className="d-flex border mb-2">
      <div className={`styleguide-color-token styleguide-color-token--${name}`} />
      <div className="px-2 overflow-hidden">
        <h5>{`chemstrap-${name}`}</h5>
        <p>{application}</p>
      </div>
    </div>
  );

  const renderColors = () => (
    renderStyleguideCard(
      'Colors',
      <>
        <h3>Base Colors</h3>
        <div className="row mb-3">
          <div className="col">
            {renderColorCard('white', 'Application background')}
            {renderColorCard('carbon', 'Base color for text and borders')}
            {renderColorCard('silicon', 'Base color for surface backgrounds')}
          </div>
          <div className="col">
            {renderColorCard('blue', 'Primary functions')}
            {renderColorCard('blue-dark', 'Active state')}
            {renderColorCard('blue-dull', 'Draggable interfaces')}
          </div>
          <div className="col">
            {renderColorCard('red', 'Error, Danger, Destructive Operations')}
            {renderColorCard('orange', 'Warning')}
            {renderColorCard('green', 'Success, Affirmation')}
          </div>
        </div>
        <h3>Shades</h3>
        <div className="row mb-3">
          <div className="col">
            <h4>Surfaces</h4>
            <div className="surface-base border p-2 mb-2">Surface base</div>
            <div className="surface-lighten1 border p-2 mb-2">Surface lighten1</div>
            <div className="surface-lighten2 border p-2 mb-2">Surface lighten2</div>
            <div className="surface-lighten3 border p-2 mb-2">Surface lighten3</div>
            <div className="surface-lighten4 border p-2 mb-2">Surface lighten4</div>
            <div className="surface-lighten5 border p-2 mb-2">Surface lighten5</div>
          </div>
          <div className="col">
            <h4>Text / border colors</h4>
            <div className="border border-base text-base p-2 mb-2">Text / border base</div>
            <div className="text-lighten1 border-lighten1 border p-2 mb-2">Text / border ligthen1</div>
            <div className="text-lighten2 border-lighten2 border p-2 mb-2">Text / border lighten2</div>
            <div className="text-lighten3 border-lighten3 border p-2 mb-2">
              Text / border lighten3 (default border color)
            </div>
            <div className="text-lighten4 border-lighten4 border p-2 mb-2">Text / border lighten4</div>
            <div className="text-lighten5 border-lighten5 border p-2 mb-2">Text / border lighten5</div>
          </div>
        </div>
      </>
    )
  );

  const buttonVariants = [
    'primary',
    'secondary',
    'success',
    'danger',
    'warning',
    'light',
    'paper',
    'knock-out'
  ];

  const renderButtons = () => (
    renderStyleguideCard(
      'Buttons',
      <>
        <p className="styleguide-label">Default state</p>
        <div className="d-flex mb-3 gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant}>
              {`${variant} Button`}
            </Button>
          ))}
        </div>
        <p className="styleguide-label">Active state</p>
        <div className="d-flex mb-3 gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant} active>
              {`${variant} Button`}
            </Button>
          ))}
        </div>
        <p className="styleguide-label">Disabled state</p>
        <div className="d-flex mb-3 gap-3">
          {buttonVariants.map((variant) => (
            <Button key={variant} variant={variant} disabled>
              {`${variant} Button`}
            </Button>
          ))}
        </div>
      </>
    )
  );

  const renderForms = () => (
    renderStyleguideCard(
      'Forms',
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
    )
  );

  return (
    <Container className="my-3">
      <h1>ChemStrap Styleguide</h1>
      <Tabs defaultActiveKey={0} id="collection-management-tab" className="surface-tabs">
        <Tab eventKey={0} title="Typography">{renderTypography()}</Tab>
        <Tab eventKey={1} title="Colors">{renderColors()}</Tab>
        <Tab eventKey={2} title="Buttons">{renderButtons()}</Tab>
        <Tab eventKey={3} title="Forms">{renderForms()}</Tab>
      </Tabs>
    </Container>
  );
}

export default Styleguide;
