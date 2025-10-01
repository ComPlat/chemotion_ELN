import React from 'react';
import {
  Title,
  Subtitle,
  Primary,
  Canvas
} from '@storybook/blocks';

export function Typography() {
  return (
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
        <a href="https://chemotion.net/" target="_blank" rel="noreferrer">link</a>
        &nbsp;to another page.
      </p>
      <p><strong>This line rendered as bold text.</strong></p>
      <p><em>This line rendered as italicized text.</em></p>
      <p className="condensed-text-width">
        This line rendered as condensed. The class&nbsp;
        <strong>condensed-text-width</strong>
        , when different pieces of information need to be presented next to each other in compact form.
      </p>
    </>
  );
}

export function SupportedButRare() {
  return (
    <>
      <p><code>This is a piece of computer code.</code></p>
      <p><del>This line of text is meant to be treated as deleted text.</del></p>
      <p>
        You can use the mark tag to
        <mark>highlight</mark>
        text.
      </p>
      <p><s>This line of text is meant to be treated as no longer accurate.</s></p>
      <p><u>This line of text will render as underlined.</u></p>
      <p><small>This line of text is meant to be treated as fine print.</small></p>
    </>
  );
}

export default {
  title: 'Design Principles/Typography',
  tags: ['autodocs'],
  parameters: {
    options: {
      storySort: {
        order: ['Typography', 'SupportedButRare'],
      },
    },
    docs: {
      page: () => (
        <>
          <Title />
          <Subtitle>Text formats</Subtitle>
          <Primary />
          <Subtitle>Supported but rare</Subtitle>
          <Canvas of={SupportedButRare} />
        </>
      ),
    },
  },
};
