import React from 'react';
import { Title, Subtitle, Primary, Canvas } from '@storybook/blocks';

const renderColorCard = (name, application) => (
  <div className="d-flex border mb-2">
    <div className={`styleguide-color-token styleguide-color-token--${name}`} />
    <div className="px-2 overflow-hidden">
      <h5>{`chemstrap-${name}`}</h5>
      <p>{application}</p>
    </div>
  </div>
);

export function Colors() {
  return (
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
  );
}

export function Shades() {
  return (
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
  );
}

export default {
  title: 'Design Principles/Colors',
  tags: ['autodocs'],
  parameters: {
    options: {
      storySort: {
        order: ['Colors', 'Shades'],
      },
    },
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle />
          <Primary />
          <Title>Shades</Title>
          <Canvas of={Shades} />
        </>
      ),
    },
  },
};
