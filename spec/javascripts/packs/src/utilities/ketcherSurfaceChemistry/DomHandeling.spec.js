/* eslint-disable no-undef */
import assert from 'assert';
import {
  describe, it, beforeEach, afterEach
} from 'mocha';
import {
  updateTemplatesInTheCanvas,
  buttonClickForRectangleSelection,
  updateImagesInTheCanvas,
} from 'src/utilities/ketcherSurfaceChemistry/DomHandeling';

const SVG_NS = 'http://www.w3.org/2000/svg';
const CANVAS_CLASS = 'StructEditor-module_intermediateCanvas__fR3ws';

// Minimal iframeRef mock backed by the global JSDOM document.
// contentWindow.addEventListener is needed by addGreenCircleOnCanvasImages.
const makeIframeRef = () => ({
  current: {
    contentWindow: {
      document,
      scrollX: 0,
      scrollY: 0,
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  },
});

// Build the canvas container div + its SVG child, appended to document.body.
const buildCanvasContainer = () => {
  const container = document.createElement('div');
  container.className = CANVAS_CLASS;
  const svg = document.createElementNS(SVG_NS, 'svg');
  container.appendChild(svg);
  document.body.appendChild(container);
  return { container, svg };
};

// Append a <text><tspan>label</tspan></text> into targetSvg.
// textContent is set only on the tspan so that textEl.textContent === label
// (setting it on the parent replaces child nodes).
const addTextElement = (targetSvg, label) => {
  const textEl = document.createElementNS(SVG_NS, 'text');
  const tspan = document.createElementNS(SVG_NS, 'tspan');
  tspan.textContent = label;
  textEl.appendChild(tspan);
  targetSvg.appendChild(textEl);
  return { textEl, tspan };
};

// ─────────────────────────────────────────────────────────────────────────────
// updateTemplatesInTheCanvas
// ─────────────────────────────────────────────────────────────────────────────
describe('DomHandeling — updateTemplatesInTheCanvas', () => {
  let container;
  let svg;

  beforeEach(() => {
    ({ container, svg } = buildCanvasContainer());
  });

  afterEach(() => {
    if (container.parentNode) container.parentNode.removeChild(container);
  });

  it('hides "A" text inside the canvas container SVG', async () => {
    const { tspan } = addTextElement(svg, 'A');
    await updateTemplatesInTheCanvas(makeIframeRef());
    assert.strictEqual(
      tspan.style.getPropertyValue('fill'),
      'transparent',
      'tspan fill should be set to transparent'
    );
  });

  it('applies fill with !important so Ketcher CSS cannot override it', async () => {
    const { tspan } = addTextElement(svg, 'A');
    await updateTemplatesInTheCanvas(makeIframeRef());
    assert.strictEqual(
      tspan.style.getPropertyPriority('fill'),
      'important',
      'fill must carry !important priority'
    );
  });

  it('hides "A" even when textContent has leading/trailing whitespace', async () => {
    const textEl = document.createElementNS(SVG_NS, 'text');
    const tspan = document.createElementNS(SVG_NS, 'tspan');
    tspan.textContent = ' A ';
    textEl.appendChild(tspan);
    svg.appendChild(textEl);

    await updateTemplatesInTheCanvas(makeIframeRef());

    assert.strictEqual(
      tspan.style.getPropertyValue('fill'),
      'transparent',
      'whitespace-padded "A" must still be hidden (trim check)'
    );
  });

  it('does not touch text elements whose content is not "A"', async () => {
    const { tspan } = addTextElement(svg, 'C');
    await updateTemplatesInTheCanvas(makeIframeRef());
    assert.strictEqual(
      tspan.style.getPropertyValue('fill'),
      '',
      'non-"A" text must not be modified'
    );
  });

  // Regression guard: the old code used querySelector('svg') which returns the FIRST
  // svg in the document — potentially a toolbar icon svg, not the canvas.
  // The fix uses .StructEditor-module_intermediateCanvas__fR3ws > :first-child instead.
  it('targets the canvas SVG, not the first SVG in the document', async () => {
    // Insert a toolbar SVG *before* the canvas container — the first svg in the doc.
    const toolbarSvg = document.createElementNS(SVG_NS, 'svg');
    const { tspan: toolbarTspan } = addTextElement(toolbarSvg, 'A');
    document.body.insertBefore(toolbarSvg, container);

    const { tspan: canvasTspan } = addTextElement(svg, 'A');

    await updateTemplatesInTheCanvas(makeIframeRef());

    assert.strictEqual(
      canvasTspan.style.getPropertyValue('fill'),
      'transparent',
      'canvas "A" must be hidden'
    );
    assert.strictEqual(
      toolbarTspan.style.getPropertyValue('fill'),
      '',
      'toolbar SVG "A" must not be touched — function should be canvas-scoped'
    );

    toolbarSvg.parentNode.removeChild(toolbarSvg);
  });

  it('no-ops gracefully when iframeRef is null', async () => {
    await updateTemplatesInTheCanvas(null);
    await updateTemplatesInTheCanvas({ current: null });
  });

  it('no-ops when the canvas container class is not present', async () => {
    container.className = 'some-other-class';
    const { tspan } = addTextElement(svg, 'A');
    await updateTemplatesInTheCanvas(makeIframeRef());
    assert.strictEqual(
      tspan.style.getPropertyValue('fill'),
      '',
      'fill must be unchanged when canvas container is absent'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// buttonClickForRectangleSelection
// ─────────────────────────────────────────────────────────────────────────────
describe('DomHandeling — buttonClickForRectangleSelection', () => {
  let button;
  let clickCount;

  beforeEach(() => {
    clickCount = 0;
    button = document.createElement('button');
    button.setAttribute('data-testid', 'select-rectangle');
    button.addEventListener('click', () => { clickCount += 1; });
    document.body.appendChild(button);
  });

  afterEach(() => {
    if (button.parentNode) button.parentNode.removeChild(button);
  });

  it('clicks the button when it does not have the active class', async () => {
    await buttonClickForRectangleSelection(makeIframeRef());
    assert.strictEqual(clickCount, 1, 'button should be clicked once');
  });

  // Regression guard: clicking a Ketcher tool that is already active toggles it OFF.
  // The fix checks classList.contains('active') and skips the click.
  it('does NOT click the button when it already has the active class', async () => {
    button.classList.add('active');
    await buttonClickForRectangleSelection(makeIframeRef());
    assert.strictEqual(clickCount, 0, 'active tool must not be toggled off');
  });

  it('no-ops gracefully when the button is not in the DOM', async () => {
    button.removeAttribute('data-testid');
    await buttonClickForRectangleSelection(makeIframeRef());
    assert.strictEqual(clickCount, 0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// updateImagesInTheCanvas — image re-layering
// ─────────────────────────────────────────────────────────────────────────────
describe('DomHandeling — updateImagesInTheCanvas', () => {
  let container;
  let svg;

  beforeEach(() => {
    ({ container, svg } = buildCanvasContainer());
  });

  afterEach(() => {
    if (container.parentNode) container.parentNode.removeChild(container);
  });

  // Regression guard: the old code used svg.removeChild(img) which throws NotFoundError
  // because Ketcher nests <image> inside <g>, not as a direct SVG child.
  // The fix uses img.parentNode?.removeChild(img).
  it('moves an <image> from a nested <g> to the SVG root without throwing', async () => {
    const g = document.createElementNS(SVG_NS, 'g');
    const img = document.createElementNS(SVG_NS, 'image');
    g.appendChild(img);
    svg.appendChild(g);

    assert.strictEqual(img.parentNode, g, 'image starts inside <g>');

    await updateImagesInTheCanvas(makeIframeRef());

    assert.strictEqual(img.parentNode, svg, 'image must be moved to the SVG root');
  });

  it('does not throw when the <image> is already a direct SVG child', async () => {
    const img = document.createElementNS(SVG_NS, 'image');
    svg.appendChild(img);
    await updateImagesInTheCanvas(makeIframeRef());
    assert.strictEqual(img.parentNode, svg);
  });

  it('is a no-op when there are no <image> elements', async () => {
    await updateImagesInTheCanvas(makeIframeRef());
    assert.strictEqual(svg.querySelectorAll('image').length, 0);
  });

  it('appends images as the last SVG children so they render on top', async () => {
    const g = document.createElementNS(SVG_NS, 'g');
    const img = document.createElementNS(SVG_NS, 'image');
    g.appendChild(img);
    svg.appendChild(g);

    // A text element appended after the group simulates Ketcher adding 'A' after images.
    const textEl = document.createElementNS(SVG_NS, 'text');
    svg.appendChild(textEl);

    await updateImagesInTheCanvas(makeIframeRef());

    // Image must be the last child of svg (SVG paints last = on top).
    assert.strictEqual(
      svg.lastElementChild,
      img,
      'image must be the last SVG child to render above text'
    );
  });
});
