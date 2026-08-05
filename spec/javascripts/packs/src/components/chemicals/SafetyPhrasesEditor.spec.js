import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import SafetyPhrasesEditor, { normalizeSafetyPhrases } from 'src/components/chemicals/SafetyPhrasesEditor';

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
});
