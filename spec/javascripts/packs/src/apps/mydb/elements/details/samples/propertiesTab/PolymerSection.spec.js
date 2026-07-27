import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
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

  describe('handleCustomInfoChanged', () => {
    it('updates the custom_info field and calls handleSampleChanged', () => {
      const sample = buildSample();
      const handleSampleChanged = sinon.spy();
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={handleSampleChanged}
          handleAmountChanged={() => {}}
        />
      );

      wrapper.instance().handleCustomInfoChanged(
        { target: { name: 'cross_linkage', value: '2%' } },
        sample.residues[0],
        sample
      );

      expect(sample.residues[0].custom_info.cross_linkage).toEqual('2%');
      expect(handleSampleChanged.calledOnceWith(sample)).toEqual(true);
    });

    it('sets formulaChanged on the sample when the formula field changes', () => {
      const sample = buildSample();
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );

      wrapper.instance().handleCustomInfoChanged(
        { target: { name: 'formula', value: 'C2H4' } },
        sample.residues[0],
        sample
      );

      expect(sample.formulaChanged).toEqual(true);
    });

    it('does not set formulaChanged when formula is cleared', () => {
      const sample = buildSample();
      sample.formulaChanged = false;
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );

      wrapper.instance().handleCustomInfoChanged(
        { target: { name: 'formula', value: '' } },
        sample.residues[0],
        sample
      );

      expect(sample.formulaChanged).toEqual(false);
    });
  });

  describe('handlePolymerTypeSelectChanged', () => {
    it('sets polymer_type, removes surface_type, and calls handleSampleChanged', () => {
      const sample = buildSample();
      sample.residues[0].custom_info.surface_type = 'glass';
      const handleSampleChanged = sinon.spy();
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={handleSampleChanged}
          handleAmountChanged={() => {}}
        />
      );

      wrapper.instance().handlePolymerTypeSelectChanged('polyethyleneglycol', sample.residues[0], sample);

      expect(sample.residues[0].custom_info.polymer_type).toEqual('polyethyleneglycol');
      expect(Object.prototype.hasOwnProperty.call(sample.residues[0].custom_info, 'surface_type')).toEqual(false);
      expect(handleSampleChanged.calledOnceWith(sample)).toEqual(true);
    });
  });

  describe('handleSurfaceTypeSelectChanged', () => {
    it('sets surface_type, removes polymer_type, and calls handleSampleChanged', () => {
      const sample = buildSample();
      const handleSampleChanged = sinon.spy();
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={handleSampleChanged}
          handleAmountChanged={() => {}}
        />
      );

      wrapper.instance().handleSurfaceTypeSelectChanged('glass', sample.residues[0], sample);

      expect(sample.residues[0].custom_info.surface_type).toEqual('glass');
      expect(Object.prototype.hasOwnProperty.call(sample.residues[0].custom_info, 'polymer_type')).toEqual(false);
      expect(handleSampleChanged.calledOnceWith(sample)).toEqual(true);
    });
  });

  describe('handleCustomInfoNumericChanged for non-loading fields', () => {
    it('calls handleSampleChanged when a non-loading numeric field changes', () => {
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
        { value: 42 },
        'some_other_field',
        sample.residues[0],
        sample
      );

      expect(sample.residues[0].custom_info.some_other_field).toEqual(42);
      expect(handleSampleChanged.calledOnceWith(sample)).toEqual(true);
      expect(handleAmountChanged.called).toEqual(false);
    });
  });

  describe('error notifications in handleCustomInfoNumericChanged', () => {
    let notificationCalls;
    let notifications;

    beforeEach(() => {
      notificationCalls = [];
      notifications = { add: (n) => notificationCalls.push(n) };
    });

    it('shows an error notification when loading is set to zero', () => {
      const sample = buildSample();
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );
      wrapper.instance().context = { notifications };

      wrapper.instance().handleCustomInfoNumericChanged(
        { value: 0.0, showString: false },
        'loading',
        sample.residues[0],
        sample
      );

      expect(notificationCalls.length).toEqual(1);
      expect(notificationCalls[0].level).toEqual('error');
    });

    it('does not show a zero-loading warning while the user is still typing', () => {
      const sample = buildSample();
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );
      wrapper.instance().context = { notifications };

      wrapper.instance().handleCustomInfoNumericChanged(
        { value: 0.0, showString: true },
        'loading',
        sample.residues[0],
        sample
      );

      expect(notificationCalls.length).toEqual(0);
    });

    it('shows an error notification when MW * loading exceeds 1000', () => {
      const sample = buildSample(); // molecule.molecular_weight = 100
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );
      wrapper.instance().context = { notifications };

      // 100 * 11 = 1100 > 1000
      wrapper.instance().handleCustomInfoNumericChanged(
        { value: 11 },
        'loading',
        sample.residues[0],
        sample
      );

      expect(notificationCalls.length).toEqual(1);
      expect(notificationCalls[0].level).toEqual('error');
    });

    it('does not show an error notification for a valid loading value', () => {
      const sample = buildSample(); // molecule.molecular_weight = 100
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );
      wrapper.instance().context = { notifications };

      // 100 * 5 = 500 ≤ 1000
      wrapper.instance().handleCustomInfoNumericChanged(
        { value: 5 },
        'loading',
        sample.residues[0],
        sample
      );

      expect(notificationCalls.length).toEqual(0);
    });
  });

  describe('handlePRadioChanged with elemental composition loading', () => {
    it('adopts the composition loading when switching to a type that has one', () => {
      const sample = buildSample();
      sample.elemental_compositions = [
        { composition_type: 'found', loading: 2.5 }
      ];
      sample.residues[0].custom_info.loading_type = 'external';
      const handleSampleChanged = sinon.spy();
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={handleSampleChanged}
          handleAmountChanged={() => {}}
        />
      );

      wrapper.instance().handlePRadioChanged(
        { target: { value: 'found' } },
        sample.residues[0],
        sample
      );

      expect(sample.residues[0].custom_info.loading_type).toEqual('found');
      expect(sample.residues[0].custom_info.loading).toEqual(2.5);
      expect(handleSampleChanged.calledOnceWith(sample)).toEqual(true);
    });

    it('leaves loading unchanged when switching to a type with no composition', () => {
      const sample = buildSample();
      sample.elemental_compositions = [];
      sample.residues[0].custom_info.loading_type = 'external';
      sample.residues[0].custom_info.loading = 3.0;
      const handleSampleChanged = sinon.spy();
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={handleSampleChanged}
          handleAmountChanged={() => {}}
        />
      );

      wrapper.instance().handlePRadioChanged(
        { target: { value: 'found' } },
        sample.residues[0],
        sample
      );

      // no matching composition → loading is not overwritten
      expect(sample.residues[0].custom_info.loading).toEqual(3.0);
      expect(handleSampleChanged.calledOnce).toEqual(true);
    });
  });

  describe('render', () => {
    it('shows the polymer loading section when sample is a reaction product', () => {
      const sample = buildSample();
      sample.reaction_product = true;
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );

      // Bug 6 fix: loading section must be visible for reaction products so EA
      // results can be entered and yield can be calculated correctly.
      expect(wrapper.find('NumeralInputWithUnitsCompo').length).toEqual(1);
    });

    it('shows the polymer loading section for non-reaction-product samples', () => {
      const sample = buildSample();
      sample.reaction_product = false;
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );

      expect(wrapper.find('NumeralInputWithUnitsCompo').length).toEqual(1);
    });

    it('disables the loading input when loading_type is not external', () => {
      const sample = buildSample();
      sample.residues[0].custom_info.loading_type = 'found';
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );

      const loadingInput = wrapper.find('NumeralInputWithUnitsCompo').at(0);
      expect(loadingInput.prop('disabled')).toEqual(true);
    });

    it('enables the loading input when loading_type is external', () => {
      const sample = buildSample();
      sample.residues[0].custom_info.loading_type = 'external';
      const wrapper = shallow(
        <PolymerSection
          sample={sample}
          handleSampleChanged={() => {}}
          handleAmountChanged={() => {}}
        />
      );

      const loadingInput = wrapper.find('NumeralInputWithUnitsCompo').at(0);
      expect(loadingInput.prop('disabled')).toEqual(false);
    });

    // Bug 3 fix: 'Elemental analyses' radio was always disabled before saving because
    // relLoading only exists after the backend calculates it on save. Fix allows
    // selection when composition data exists (relComposition present), even before
    // loading is calculated.
    describe("'Elemental analyses' radio (value='found') disabled logic", () => {
      const getFoundRadioDisabled = (sample) => {
        const instance = shallow(
          <PolymerSection
            sample={sample}
            handleSampleChanged={() => {}}
            handleAmountChanged={() => {}}
          />
        ).instance();
        const el = instance.customInfoRadio('Elemental analyses', 'found', sample.residues[0], sample);
        return el.props.disabled;
      };

      it('is disabled when no composition data and no relLoading', () => {
        const sample = buildSample();
        sample.elemental_compositions = [];
        expect(getFoundRadioDisabled(sample)).toEqual(true);
      });

      it('is enabled when composition data exists but loading not yet calculated', () => {
        const sample = buildSample();
        sample.elemental_compositions = [{ composition_type: 'found', loading: null }];
        expect(getFoundRadioDisabled(sample)).toEqual(false);
      });

      it('is enabled when relLoading is present (post-save state)', () => {
        const sample = buildSample();
        sample.elemental_compositions = [{ composition_type: 'found', loading: 2.5 }];
        expect(getFoundRadioDisabled(sample)).toEqual(false);
      });
    });
  });
});
