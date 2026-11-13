import React from 'react';
import { configure, mount, shallow } from 'enzyme';
import { Button } from 'react-bootstrap';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import SafetyPhrasesEditor, { normalizeSafetyPhrases, SafetyPhrasesCopyButton } from 'src/components/chemicals/SafetyPhrasesEditor';
import CopyButton from 'src/components/common/CopyButton';

configure({ adapter: new Adapter() });

const buildResponse = (data) => ({
  ok: true,
  json: () => Promise.resolve(data),
});

const sectionWithPrefix = (wrapper, idPrefix) => (
  wrapper.findWhere((n) => n.name() === 'PhraseSection' && n.prop('idPrefix') === idPrefix).first()
);

const pictogramSection = (wrapper) => (
  wrapper.findWhere((n) => n.name() === 'PictogramSection').first()
);

describe('normalizeSafetyPhrases', () => {
  it('returns empty defaults for null/undefined input', () => {
    expect(normalizeSafetyPhrases(null)).toEqual({ h_statements: {}, p_statements: {}, pictograms: [] });
    expect(normalizeSafetyPhrases(undefined)).toEqual({ h_statements: {}, p_statements: {}, pictograms: [] });
  });

  it('preserves valid statements and pictograms', () => {
    const value = {
      h_statements: { H200: ' Unstable explosive' },
      p_statements: { P102: ' Keep out of reach of children.' },
      pictograms: ['GHS01'],
    };
    expect(normalizeSafetyPhrases(value)).toEqual(value);
  });

  it('coerces malformed shapes safely', () => {
    const value = { h_statements: 'not-an-object', p_statements: null, pictograms: 'GHS01' };
    expect(normalizeSafetyPhrases(value)).toEqual({ h_statements: {}, p_statements: {}, pictograms: [] });
  });

  it('drops non-string pictogram entries', () => {
    expect(normalizeSafetyPhrases({ pictograms: ['GHS01', 42, null] })).toEqual({
      h_statements: {}, p_statements: {}, pictograms: ['GHS01'],
    });
  });

  it('strips pictogram codes outside the GHS01-GHS09 whitelist', () => {
    expect(normalizeSafetyPhrases({ pictograms: ['GHS01', '../evil', 'GHS09', 'GHS99', 'ghs01'] })).toEqual({
      h_statements: {}, p_statements: {}, pictograms: ['GHS01', 'GHS09'],
    });
  });
});

describe('SafetyPhrasesEditor', () => {
  beforeEach(() => {
    const fetchStub = sinon.stub(global, 'fetch');
    fetchStub.withArgs('/json/hazardPhrases.json')
      .resolves(buildResponse({ H200: 'Unstable explosive', H315: 'Causes skin irritation' }));
    fetchStub.withArgs('/json/precautionaryPhrases.json')
      .resolves(buildResponse({ P102: 'Keep out of reach of children.' }));
    fetchStub.withArgs('/json/pictograms.json')
      .resolves(buildResponse({ GHS01: 'Explosive.gif', GHS07: 'Harmful_Irritant.gif' }));
  });

  afterEach(() => {
    sinon.restore();
  });

  it('renders H, P, and pictogram sections', () => {
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, { value: null, onChange: sinon.spy() })
    );
    expect(sectionWithPrefix(wrapper, 'safety-h-phrases').exists()).toBe(true);
    expect(sectionWithPrefix(wrapper, 'safety-p-phrases').exists()).toBe(true);
    expect(pictogramSection(wrapper).exists()).toBe(true);
  });

  describe('folding the three sections', () => {
    // PhraseSection renders a CollapsibleSection, so the body is two levels down.
    const bodyOf = (section) => section.shallow().shallow();

    const editorWith = (value) => shallow(
      React.createElement(SafetyPhrasesEditor, { value, onChange: sinon.spy() })
    );

    it('starts folded while a section holds nothing', () => {
      const inner = bodyOf(sectionWithPrefix(editorWith(null), 'safety-h-phrases'));
      expect(inner.find('div[hidden=true]').exists()).toBe(true);
      expect(inner.text()).toEqual(expect.stringContaining('none added yet'));
    });

    it('starts open when the section already holds statements', () => {
      const value = { h_statements: { H315: ' Causes skin irritation' } };
      const inner = bodyOf(sectionWithPrefix(editorWith(value), 'safety-h-phrases'));
      expect(inner.find('div[hidden=true]').exists()).toBe(false);
      expect(inner.text()).toEqual(expect.stringContaining('1'));
    });

    it('folds pictograms on the same terms', () => {
      const empty = bodyOf(pictogramSection(editorWith(null)));
      expect(empty.find('div[hidden=true]').exists()).toBe(true);

      const filled = bodyOf(pictogramSection(editorWith({ pictograms: ['GHS07'] })));
      expect(filled.find('div[hidden=true]').exists()).toBe(false);
    });

    it('opens an empty section on the caret', () => {
      const inner = bodyOf(sectionWithPrefix(editorWith(null), 'safety-h-phrases'));
      expect(inner.find('div[hidden=true]').exists()).toBe(true);

      inner.find(Button).simulate('click');
      expect(inner.find('div[hidden=true]').exists()).toBe(false);
    });
  });

  it('passes existing phrases through as section items', () => {
    const value = {
      h_statements: { H315: ' Causes skin irritation' },
      p_statements: { P102: ' Keep out of reach of children.' },
      pictograms: ['GHS07'],
    };
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, { value, onChange: sinon.spy() })
    );

    const hItems = sectionWithPrefix(wrapper, 'safety-h-phrases').prop('items');
    expect(hItems).toHaveLength(1);
    expect(hItems[0].code).toEqual('H315');
    expect(hItems[0].text).toEqual('Causes skin irritation');

    const pItems = sectionWithPrefix(wrapper, 'safety-p-phrases').prop('items');
    expect(pItems[0].code).toEqual('P102');

    const gItems = pictogramSection(wrapper).prop('items');
    expect(gItems[0].code).toEqual('GHS07');
  });

  it('emits onChange with leading-space text when adding an H phrase', () => {
    const onChange = sinon.spy();
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, { value: null, onChange })
    );
    sectionWithPrefix(wrapper, 'safety-h-phrases').prop('onAdd')({
      value: 'H200',
      text: 'Unstable explosive',
    });
    expect(onChange.calledOnce).toBe(true);
    expect(onChange.firstCall.args[0]).toEqual({
      h_statements: { H200: ' Unstable explosive' },
      p_statements: {},
      pictograms: [],
    });
  });

  it('deletion of H phrase preserves P phrases and pictograms', () => {
    const onChange = sinon.spy();
    const value = {
      h_statements: { H315: ' Causes skin irritation' },
      p_statements: { P102: ' Keep out of reach of children.' },
      pictograms: ['GHS07'],
    };
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, { value, onChange })
    );
    const items = sectionWithPrefix(wrapper, 'safety-h-phrases').prop('items');
    items[0].onDelete();
    expect(onChange.calledOnce).toBe(true);
    const emitted = onChange.firstCall.args[0];
    expect(emitted.h_statements).toEqual({});
    expect(emitted.p_statements).toEqual(value.p_statements);
    expect(emitted.pictograms).toEqual(value.pictograms);
  });

  it('deletion of P phrase preserves H phrases and pictograms', () => {
    const onChange = sinon.spy();
    const value = {
      h_statements: { H315: ' Causes skin irritation' },
      p_statements: { P102: ' Keep out of reach of children.' },
      pictograms: ['GHS07'],
    };
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, { value, onChange })
    );
    const items = sectionWithPrefix(wrapper, 'safety-p-phrases').prop('items');
    items[0].onDelete();
    expect(onChange.calledOnce).toBe(true);
    const emitted = onChange.firstCall.args[0];
    expect(emitted.p_statements).toEqual({});
    expect(emitted.h_statements).toEqual(value.h_statements);
    expect(emitted.pictograms).toEqual(value.pictograms);
  });

  it('emits onChange when adding a pictogram and ignores duplicates', () => {
    const onChange = sinon.spy();
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, {
        value: { h_statements: {}, p_statements: {}, pictograms: ['GHS01'] },
        onChange,
      })
    );
    pictogramSection(wrapper).prop('onAdd')({ value: 'GHS01' });
    expect(onChange.called).toBe(false);

    pictogramSection(wrapper).prop('onAdd')({ value: 'GHS07' });
    expect(onChange.calledOnce).toBe(true);
    expect(onChange.firstCall.args[0].pictograms).toEqual(['GHS01', 'GHS07']);
  });

  it('ignores invalid pictogram values before emitting onChange', () => {
    const onChange = sinon.spy();
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, { value: null, onChange })
    );

    pictogramSection(wrapper).prop('onAdd')({ value: '../evil' });
    pictogramSection(wrapper).prop('onAdd')({ value: 'GHS99' });

    expect(onChange.called).toBe(false);
  });

  it('emits onChange when pictogram delete handler runs, preserving other sections', () => {
    const onChange = sinon.spy();
    const value = {
      h_statements: { H315: ' Causes skin irritation' },
      p_statements: { P102: ' note' },
      pictograms: ['GHS01', 'GHS07'],
    };
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, { value, onChange })
    );
    const items = pictogramSection(wrapper).prop('items');
    items[0].onDelete();
    expect(onChange.calledOnce).toBe(true);
    const emitted = onChange.firstCall.args[0];
    expect(emitted.pictograms).toEqual(['GHS07']);
    expect(emitted.h_statements).toEqual(value.h_statements);
    expect(emitted.p_statements).toEqual(value.p_statements);
  });

  it('ignores onAdd invocations with null (cleared select)', () => {
    const onChange = sinon.spy();
    const wrapper = shallow(
      React.createElement(SafetyPhrasesEditor, { value: null, onChange })
    );
    sectionWithPrefix(wrapper, 'safety-h-phrases').prop('onAdd')(null);
    expect(onChange.called).toBe(false);
  });

  describe('copy buttons', () => {
    const PHRASES = {
      h_statements: { H225: ' Highly flammable liquid and vapour.', 'H301+H311': ' Toxic.' },
      p_statements: {},
      pictograms: ['GHS07'],
    };
    let wrapper;
    let writeText;
    let originalIsSecureContext;

    const flush = () => new Promise((resolve) => { setTimeout(resolve, 0); });
    const mountEditor = async (value) => {
      wrapper = mount(React.createElement(SafetyPhrasesEditor, { value, onChange: sinon.spy() }));
      await flush();
      wrapper.update();
    };
    const mountCopyAll = async (value) => {
      wrapper = mount(React.createElement(SafetyPhrasesCopyButton, { value }));
      await flush();
      wrapper.update();
    };
    const copyButton = (label) => wrapper.find(`button[aria-label="${label}"]`);
    const clickAndRead = async (label) => {
      copyButton(label).simulate('click');
      await flush();
      return writeText.lastCall.args[0];
    };

    beforeEach(() => {
      originalIsSecureContext = window.isSecureContext;
      window.isSecureContext = true;
      writeText = sinon.stub().resolves();
      navigator.clipboard = { writeText };
    });

    afterEach(() => {
      if (wrapper) wrapper.unmount();
      wrapper = null;
      window.isSecureContext = originalIsSecureContext;
      delete navigator.clipboard;
    });

    it('renders a copy button per section and per phrase, leaving copy all to the heading', async () => {
      await mountEditor(PHRASES);
      expect(copyButton('Copy all safety phrases and pictograms')).toHaveLength(0);
      ['Copy hazard statements',
        'Copy precautionary statements', 'Copy pictograms', 'Copy H225', 'Copy H301+H311']
        .forEach((label) => expect(copyButton(label)).toHaveLength(1));
    });

    it('disables the copy button of an empty section, and copy all when nothing is set', async () => {
      await mountEditor(PHRASES);
      expect(copyButton('Copy precautionary statements').prop('disabled')).toBe(true);
      expect(copyButton('Copy hazard statements').prop('disabled')).toBe(false);
      wrapper.unmount();

      await mountEditor(null);
      expect(wrapper.find(CopyButton).everyWhere((b) => b.prop('disabled'))).toBe(true);
      wrapper.unmount();

      await mountCopyAll(null);
      expect(copyButton('Copy all safety phrases and pictograms').prop('disabled')).toBe(true);
    });

    it('copies a single phrase as "code: text"', async () => {
      await mountEditor(PHRASES);
      expect(await clickAndRead('Copy H225')).toEqual('H225: Highly flammable liquid and vapour.');
    });

    it('copies a section with its heading', async () => {
      await mountEditor(PHRASES);
      expect(await clickAndRead('Copy hazard statements'))
        .toEqual('Hazard Statements\nH225: Highly flammable liquid and vapour.\nH301+H311: Toxic.');
      expect(await clickAndRead('Copy pictograms')).toEqual('Pictograms\nGHS07: Harmful Irritant');
    });

    it('copies every shown section and skips the empty one', async () => {
      await mountCopyAll(PHRASES);
      expect(await clickAndRead('Copy all safety phrases and pictograms')).toEqual([
        'Hazard Statements',
        'H225: Highly flammable liquid and vapour.',
        'H301+H311: Toxic.',
        '',
        'Pictograms',
        'GHS07: Harmful Irritant',
      ].join('\n'));
    });

    it('keeps the row copy control focusable while hidden and reveals it on focus', async () => {
      await mountEditor(PHRASES);
      const row = () => wrapper.find('li[data-code="H225"]');
      expect(copyButton('Copy H225').hasClass('opacity-0')).toBe(true);
      row().simulate('focus');
      expect(copyButton('Copy H225').hasClass('opacity-100')).toBe(true);
      row().simulate('mouseleave');
      expect(copyButton('Copy H225').hasClass('opacity-0')).toBe(true);
    });
  });
});
