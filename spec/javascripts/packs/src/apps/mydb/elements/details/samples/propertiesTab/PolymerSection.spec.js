import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import {
  describe, it
} from 'mocha';
import PolymerSection from 'src/apps/mydb/elements/details/samples/propertiesTab/PolymerSection';

configure({ adapter: new Adapter() });

describe('PolymerSection', () => {
  const buildSample = () => {
    const sample = {
      amount: 10,
      molecule: { molecular_weight: 100 },
      elemental_compositions: [],
      residues: [{
        custom_info: {
          loading: null,
          loading_type: 'external',
          external_loading: 0.0,
          formula: 'CH',
          polymer_type: 'polystyrene'
        }
      }]
    };

    Object.defineProperty(sample, 'loading', {
      get() {
        return this.residues[0].custom_info.loading;
      },
      set(value) {
        this.residues[0].custom_info.loading = value;
      }
    });

    Object.defineProperty(sample, 'external_loading', {
      get() {
        return this.residues[0].custom_info.external_loading;
      },
      set(value) {
        this.residues[0].custom_info.external_loading = value;
      }
    });

    return sample;
  };

  it('propagates external loading changes so the input keeps the edited value on blur', () => {
    const sample = buildSample();
    const handleSampleChanged = sinon.spy();
    const handleAmountChanged = sinon.spy();
    const wrapper = shallow(
      <PolymerSection
        sample={sample}
        handleSampleChanged={handleSampleChanged}
        handleAmountChanged={handleAmountChanged}
      />
    );

    wrapper.instance().handleCustomInfoNumericChanged(
      { value: 1.75 },
      'loading',
      sample.residues[0],
      sample
    );

    expect(sample.residues[0].custom_info.loading).toEqual(1.75);
    expect(sample.residues[0].custom_info.external_loading).toEqual(1.75);
    expect(handleAmountChanged.calledOnceWith(10)).toEqual(true);
    expect(handleSampleChanged.calledOnceWith(sample)).toEqual(true);
  });

  it('renders external loading when backend stores the value as a string', () => {
    const sample = buildSample();
    sample.residues[0].custom_info.external_loading = '1.75';
    sample.residues[0].custom_info.loading = '1.75';

    const wrapper = shallow(
      <PolymerSection
        sample={sample}
        handleSampleChanged={() => {}}
        handleAmountChanged={() => {}}
      />
    );

    const loadingInput = wrapper.find('NumeralInputWithUnitsCompo').at(0);
    expect(loadingInput.prop('value')).toEqual(1.75);
  });

  it('falls back to sample.loading when external_loading is an empty string', () => {
    const sample = buildSample();
    sample.residues[0].custom_info.external_loading = '';
    sample.residues[0].custom_info.loading = '1.75';

    const wrapper = shallow(
      <PolymerSection
        sample={sample}
        handleSampleChanged={() => {}}
        handleAmountChanged={() => {}}
      />
    );

    const loadingInput = wrapper.find('NumeralInputWithUnitsCompo').at(0);
    expect(loadingInput.prop('value')).toEqual(1.75);
  });

  it('falls back to sample.loading when external_loading is the default 0.0', () => {
    const sample = buildSample();
    sample.residues[0].custom_info.external_loading = 0.0;
    sample.residues[0].custom_info.loading = '1.75';

    const wrapper = shallow(
      <PolymerSection
        sample={sample}
        handleSampleChanged={() => {}}
        handleAmountChanged={() => {}}
      />
    );

    const loadingInput = wrapper.find('NumeralInputWithUnitsCompo').at(0);
    expect(loadingInput.prop('value')).toEqual(1.75);
  });

  it('passes null when external loading is unset', () => {
    const sample = buildSample();

    const wrapper = shallow(
      <PolymerSection
        sample={sample}
        handleSampleChanged={() => {}}
        handleAmountChanged={() => {}}
      />
    );

    const loadingInput = wrapper.find('NumeralInputWithUnitsCompo').at(0);
    expect(loadingInput.prop('value')).toEqual(null);
  });

  it('sets loading to null when switching to external with no values set', () => {
    const sample = buildSample();
    sample.residues[0].custom_info.loading_type = 'found';
    sample.residues[0].custom_info.loading = null;
    sample.residues[0].custom_info.external_loading = null;

    const wrapper = shallow(
      <PolymerSection
        sample={sample}
        handleSampleChanged={() => {}}
        handleAmountChanged={() => {}}
      />
    );

    wrapper.instance().handlePRadioChanged(
      { target: { value: 'external' } },
      sample.residues[0],
      sample
    );

    expect(sample.residues[0].custom_info.loading).toEqual(null);
  });

  it('parses string loading for non-external loading types', () => {
    const sample = buildSample();
    sample.residues[0].custom_info.loading_type = 'found';
    sample.residues[0].custom_info.loading = '1.75';

    const wrapper = shallow(
      <PolymerSection
        sample={sample}
        handleSampleChanged={() => {}}
        handleAmountChanged={() => {}}
      />
    );

    const loadingInput = wrapper.find('NumeralInputWithUnitsCompo').at(0);
    expect(loadingInput.prop('value')).toEqual(1.75);
  });

  it('stores a numeric loading value when external estimation is selected', () => {
    const sample = buildSample();
    sample.residues[0].custom_info.loading_type = 'found';
    sample.residues[0].custom_info.external_loading = '1.75';

    const wrapper = shallow(
      <PolymerSection
        sample={sample}
        handleSampleChanged={() => {}}
        handleAmountChanged={() => {}}
      />
    );

    wrapper.instance().handlePRadioChanged(
      { target: { value: 'external' } },
      sample.residues[0],
      sample
    );

    expect(sample.residues[0].custom_info.loading).toEqual(1.75);
  });
});
