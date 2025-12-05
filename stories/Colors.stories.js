import React from 'react';
import { Title, Subtitle, Canvas, ColorPalette, ColorItem, Markdown, Source } from '@storybook/blocks';
import { getColorValue } from './componentAttributes';

// Base colors array. Color values are fetched dynamically from CSS custom properties.
const baseColors = [
  { title: 'chemstrap-white', description: 'Application background' },
  { title: 'chemstrap-carbon', description: 'Text & borders' },
  { title: 'chemstrap-silicon', description: 'Surfaces' },
  { title: 'chemstrap-blue', description: 'Primary' },
  { title: 'chemstrap-blue-dark', description: 'Primary – active' },
  { title: 'chemstrap-blue-dull', description: 'Draggable surfaces' },
];

const semanticColors = [
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
          <Markdown>
            {`
  We aim for a significantly simplified color scheme in the interface.
  
  **Chemstrap-white** for the application background, **chemstrap-carbon** for text and borders,
  and **chemstrap-silicon** for surfaces.

  Primary interactions and active states are highlighted with accents from the **chemstrap-blue** color family.
            `}
          </Markdown>
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
          <Subtitle>Semantic Colors</Subtitle>
          <Markdown>
            {`
  The colors **chemstrap-red**, **chemstrap-green**, and **chemstrap-orange** are used sparingly,
  and only where their connotations are unambiguous:

  - **Red:** destructive action or error
  - **Green:** productive action or success message
  - **Orange:** warning or caution
            `}
          </Markdown>
          <ColorPalette>
            {semanticColors.map((color) => (
              <ColorItem
                key={color.title}
                title={color.title}
                subtitle={color.description}
                colors={[getColorValue(color.title)]}
              />
            ))}
          </ColorPalette>
          <Subtitle>Shades</Subtitle>
          <Markdown>
            {`
  Text, border and surface colors come in different shades to indicate hierarchy and interactivity.

  When setting surface colors we try to achieve differentiation with as litte contrast as possible.
  The second lightest shade is sufficient to create a clear visual distinction against the application background.
  if you want to display nested surfaces, choose the next darker shade.

  Regular text is set in the base color. Use the two darkest shades for less important text, lighter shades do not
  provide enough contrast against the application background.

  The third lightest shade is the default border color. Use darker shades if extra contrast is needed for darker
  backgrounds.
            `}
          </Markdown>
          <Canvas of={Shades} />
          <Markdown>
            {`
We provided utility classes for all shades of surface, text and border colors.

| Surface classes       | Text color classes     | Border color classes     |
|----------------------|-----------------------|--------------------------|
| \`.surface-base\`      | \`.text-base\`<br/>**(only nescessary to overwrite)**| \`.border-base\`                               |
| \`.surface-lighten1\`  | \`.text-lighten1\`                               | \`.border-lighten1\`                           |
| \`.surface-lighten2\`  | \`.text-lighten2\`                               | \`.border-lighten2\`                           |
| \`.surface-lighten3\`  | \`.text-lighten3\`                               | \`.border-lighten3\`<br/>**(or simply**\`.border\`**)**|
| \`.surface-lighten4\`  | \`.text-lighten4\`                               | \`.border-lighten4\`                           |
| \`.surface-lighten5\`  | \`.text-lighten5\`                               | \`.border-lighten5\`                           |

**Note:** These utility classes are intended for exceptional cases only. In most situations you should
rely on the default colors provided by the component.
            `}
          </Markdown>
        </>
      ),
    },
  },
};
