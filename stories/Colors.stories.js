import React from 'react';
import { Title, Subtitle, Canvas, ColorPalette, ColorItem } from '@storybook/blocks';
import { getColorValue } from './componentAttributes';

// Base colors array. Color values are fetched dynamically from CSS custom properties.
const baseColors = [
  { title: 'chemstrap-white', description: 'Application background' },
  { title: 'chemstrap-carbon', description: 'Text & borders' },
  { title: 'chemstrap-silicon', description: 'Surfaces' },
  { title: 'chemstrap-blue', description: 'Primary' },
  { title: 'chemstrap-blue-dark', description: 'Primary – active' },
  { title: 'chemstrap-blue-dull', description: 'Draggable surfaces' },
  { title: 'chemstrap-red', description: 'Danger' },
  { title: 'chemstrap-green', description: 'Success' },
  { title: 'chemstrap-orange', description: 'Warning' },
];

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
          <Subtitle>Base Colors</Subtitle>
          <ColorPalette>
            {baseColors.map((color) => (
              <ColorItem
                key={color.title}
                title={color.title}
                subtitle={color.description}
                colors={[getColorValue(color.title)]}
              />
            ))}
          </ColorPalette>
          <Subtitle>Shades</Subtitle>
          <Canvas of={Shades} />
        </>
      ),
    },
  },
};
