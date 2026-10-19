import expect from 'expect';
import {
  escapeHtml,
  formatPhrase,
  formatPhraseSections,
  formatProperties,
  humanizeKey,
  propertyLabel,
  safetyPhraseSections,
} from 'src/utilities/sdsClipboardFormat';

const PHRASES = {
  h_statements: {
    H225: ' Highly flammable liquid and vapour.',
    'H301+H311+H331': ' Toxic if swallowed, in contact with skin or if inhaled.',
  },
  p_statements: { P210: ' Keep away from heat.' },
  pictograms: ['GHS02', 'GHS06'],
};
const PICTOGRAM_NAMES = { GHS02: 'Flammable.gif', GHS06: 'Toxic.gif' };

describe('sdsClipboardFormat', () => {
  describe('formatPhraseSections', () => {
    it('writes headings, one phrase per line and a blank line between sections', () => {
      const { text } = formatPhraseSections(safetyPhraseSections(PHRASES, PICTOGRAM_NAMES));
      expect(text).toEqual([
        'Hazard Statements',
        'H225: Highly flammable liquid and vapour.',
        'H301+H311+H331: Toxic if swallowed, in contact with skin or if inhaled.',
        '',
        'Precautionary Statements',
        'P210: Keep away from heat.',
        '',
        'Pictograms',
        'GHS02: Flammable',
        'GHS06: Toxic',
      ].join('\n'));
    });

    it('renders bold headings and list items with inline styles only', () => {
      const { html } = formatPhraseSections(safetyPhraseSections(PHRASES, PICTOGRAM_NAMES));
      expect(html).toContain('font-weight:bold;">Hazard Statements</p>');
      expect(html).toContain('<li><strong>H225</strong>: Highly flammable liquid and vapour.</li>');
      expect(html).toContain('<li><strong>H301+H311+H331</strong>: Toxic if swallowed');
      expect(html).toContain('<li><strong>GHS02</strong>: Flammable</li>');
      expect(html).not.toMatch(/class=/);
    });

    it('trims the leading space the stored phrase texts carry', () => {
      const { text } = formatPhraseSections([{ title: 'Hazard Statements', items: [{ code: 'H225', text: '  Flammable. ' }] }]);
      expect(text).toEqual('Hazard Statements\nH225: Flammable.');
    });

    it('skips empty sections and returns empty output for empty input', () => {
      const { text } = formatPhraseSections(safetyPhraseSections({ p_statements: { P210: ' Keep away.' } }));
      expect(text).toEqual('Precautionary Statements\nP210: Keep away.');
      expect(formatPhraseSections([])).toEqual({ text: '', html: '' });
      expect(formatPhraseSections(safetyPhraseSections(null))).toEqual({ text: '', html: '' });
    });

    it('lists a pictogram by code alone when no name is known', () => {
      const { text } = formatPhraseSections(safetyPhraseSections({ pictograms: ['GHS07'] }));
      expect(text).toEqual('Pictograms\nGHS07');
      const echoed = formatPhraseSections([{ title: 'Pictograms', items: [{ code: 'GHS07', text: 'GHS07' }] }]);
      expect(echoed.text).toEqual('Pictograms\nGHS07');
    });

    it('escapes HTML in the html variant but not in the plain text', () => {
      const sections = [{ title: 'A & B', items: [{ code: 'H<1>', text: ' "x" <script>' }] }];
      const { text, html } = formatPhraseSections(sections);
      expect(text).toEqual('A & B\nH<1>: "x" <script>');
      expect(html).toContain('A &amp; B');
      expect(html).toContain('<strong>H&lt;1&gt;</strong>: &quot;x&quot; &lt;script&gt;');
      expect(html).not.toContain('<script>');
    });
  });

  describe('formatPhrase', () => {
    it('copies one phrase as "code: text"', () => {
      const { text, html } = formatPhrase('H225', ' Highly flammable liquid and vapour.');
      expect(text).toEqual('H225: Highly flammable liquid and vapour.');
      expect(html).toEqual('<p style="margin:0;"><strong>H225</strong>: Highly flammable liquid and vapour.</p>');
    });
  });

  describe('formatProperties', () => {
    const properties = {
      form: 'Liquid',
      boiling_point: '85 °C',
      vapor_pressure: '83 hPa (20 °C)',
      density: '1.020',
      molecular_weight: '96.1',
      some_new_key: 'x',
      color: '  ',
      odor: null,
    };

    it('writes one human-labelled line per non-blank property', () => {
      expect(formatProperties(properties).text).toEqual([
        'Form: Liquid',
        'Boiling point: 85 °C',
        'Vapor pressure: 83 hPa (20 °C)',
        'Density: 1.020',
        'Molecular weight: 96.1',
        'Some new key: x',
      ].join('\n'));
    });

    it('renders a two-column table without braces, quotes or snake_case keys', () => {
      const { text, html } = formatProperties(properties);
      expect(html).toMatch(/^<table style="border-collapse:collapse;"><tbody><tr>/);
      expect(html).toContain('font-weight:bold;">Boiling point</td><td style="padding:2pt 12pt 2pt 0;vertical-align:top;">85 °C</td>');
      [text, html].forEach((out) => {
        expect(out).not.toMatch(/[{}]|_point|molecular_weight/);
        expect(out).not.toMatch(/class=/);
      });
      expect(text).not.toContain('"');
    });

    it('escapes HTML in values', () => {
      expect(formatProperties({ form: '<b>&' }).html).toContain('&lt;b&gt;&amp;');
    });

    it('returns empty output for empty or missing input', () => {
      expect(formatProperties({})).toEqual({ text: '', html: '' });
      expect(formatProperties(undefined)).toEqual({ text: '', html: '' });
      expect(formatProperties(['a'])).toEqual({ text: '', html: '' });
    });
  });

  describe('labels', () => {
    it('maps known keys and humanizes unknown ones', () => {
      expect(propertyLabel('ph')).toEqual('pH');
      expect(propertyLabel('vapor_density')).toEqual('Vapor density');
      expect(humanizeKey('flash__point_x')).toEqual('Flash point x');
      expect(humanizeKey('')).toEqual('');
    });

    it('escapes every HTML-significant character', () => {
      expect(escapeHtml(`<a href="x">'&'</a>`)).toEqual('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
      expect(escapeHtml(null)).toEqual('');
    });
  });
});
