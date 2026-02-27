import expect from 'expect';
import sinon from 'sinon';
import { describe, it, beforeEach } from 'mocha';

import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';

describe('SequenceBasedMacromoleculeSample', () => {
  describe('Enzyme Calculations', () => {
    let sample;

    beforeEach(() => {
      sample = new SequenceBasedMacromoleculeSample({
        function_or_application: 'enzyme',
        volume_as_used_value: 1,
        volume_as_used_unit: 'L',
        molarity_value: 0.1,
        molarity_unit: 'mol/L',
        concentration_value: 1000,
        concentration_unit: 'g/L',
        activity_value: 100,
        activity_unit: 'U',
        activity_per_volume_value: 100,
        activity_per_volume_unit: 'U/L',
        activity_per_mass_value: 50,
        activity_per_mass_unit: 'U/g',
        purity: 1,
        amount_as_used_mol_value: 0,
        amount_as_used_mol_unit: 'mol',
        amount_as_used_mass_value: 0,
        amount_as_used_mass_unit: 'g'
      });
    });

    describe('calculateAmountAsUsed (amount_mol calculation with purity)', () => {
      it('should calculate amount_mol with 100% purity', () => {
        sample.purity = 1;
        sample.base_volume_as_used_value = 1;
        sample.base_molarity_value = 0.1;

        sample.calculateAmountAsUsed();

        // amount_mol = volume * molarity * purity
        // = 1 * 0.1 * 1 = 0.1 mol
        expect(sample.amount_as_used_mol_value).toBeCloseTo(0.1, 6);
      });

      it('should calculate amount_mol with 50% purity', () => {
        sample.purity = 0.5;
        sample.base_volume_as_used_value = 1;
        sample.base_molarity_value = 0.1;

        sample.calculateAmountAsUsed();

        // amount_mol = volume * molarity * purity
        // = 1 * 0.1 * 0.5 = 0.05 mol
        expect(sample.amount_as_used_mol_value).toBeCloseTo(0.05, 6);
      });

      it('should default to 100% purity when purity is 0', () => {
        sample.purity = 0;
        sample.base_volume_as_used_value = 1;
        sample.base_molarity_value = 0.1;

        sample.calculateAmountAsUsed();

        // amount_mol = volume * molarity * 1
        expect(sample.amount_as_used_mol_value).toBeCloseTo(0.1, 6);
      });

      it('should default to 100% purity when purity is undefined', () => {
        sample.purity = undefined;
        sample.base_volume_as_used_value = 1;
        sample.base_molarity_value = 0.1;

        sample.calculateAmountAsUsed();

        // amount_mol = volume * molarity * 1
        expect(sample.amount_as_used_mol_value).toBeCloseTo(0.1, 6);
      });
    });

    describe('calculateAmountAsUsedMass (mass calculation with purity via concentration_by_purity)', () => {
      it('should calculate mass with 100% purity', () => {
        sample.purity = 1;
        sample.base_volume_as_used_value = 1;
        sample.concentration_value = 1000;
        sample.concentration_unit = 'g/L';

        sample.calculateAmountAsUsedMass();

        // mass = volume * (concentration * purity)
        // = 1 * (1000 * 1) = 1000 g
        expect(sample.amount_as_used_mass_value).toBeCloseTo(1000, 6);
      });

      it('should calculate mass with 50% purity', () => {
        sample.purity = 0.5;
        sample.base_volume_as_used_value = 1;
        sample.concentration_value = 1000;
        sample.concentration_unit = 'g/L';

        sample.calculateAmountAsUsedMass();

        // mass = volume * (concentration * purity)
        // = 1 * (1000 * 0.5) = 500 g
        expect(sample.amount_as_used_mass_value).toBeCloseTo(500, 6);
      });

      it('should use concentration_by_purity getter for calculation', () => {
        sample.purity = 0.75;
        sample.concentration_value = 1000;

        const concentrationByPurity = sample.concentration_by_purity;
        expect(parseFloat(concentrationByPurity)).toBeCloseTo(750, 6);
      });
    });

    describe('calculateVolumeByMass (volume calculation with purity via concentration_by_purity)', () => {
      it('should calculate volume from mass with 100% purity', () => {
        sample.purity = 1;
        sample.base_amount_as_used_mass_value = 1000;
        sample.concentration_value = 1000;
        sample.concentration_unit = 'g/L';

        sample.calculateVolumeByMass();

        // volume = mass / (concentration * purity)
        // = 1000 / (1000 * 1) = 1 L
        expect(sample.volume_as_used_value).toBeCloseTo(1, 6);
      });

      it('should calculate volume from mass with 50% purity', () => {
        // Set values first before changing purity to avoid triggering calculations prematurely
        sample.base_amount_as_used_mass_value = 1000;
        sample.concentration_value = 1000;
        sample.concentration_unit = 'g/L';
        sample.purity = 0.5;

        sample.calculateVolumeByMass();

        // volume = mass / (concentration * purity)
        // = 1000 / (1000 * 0.5) = 2 L
        expect(sample.volume_as_used_value).toBeCloseTo(2, 6);
      });
    });

    describe('calculateVolumeByAmount (volume calculation with purity)', () => {
      it('should calculate volume from amount_mol with 100% purity', () => {
        sample.purity = 1;
        sample.base_amount_as_used_mol_value = 0.1;
        sample.base_molarity_value = 0.1;

        sample.calculateVolumeByAmount();

        // volume = amount_mol / (molarity * purity)
        // = 0.1 / (0.1 * 1) = 1 L
        expect(sample.volume_as_used_value).toBeCloseTo(1, 6);
      });

      it('should calculate volume from amount_mol with 50% purity', () => {
        sample.purity = 0.5;
        sample.base_amount_as_used_mol_value = 0.1;
        sample.base_molarity_value = 0.1;

        sample.calculateVolumeByAmount();

        // volume = amount_mol / (molarity * purity)
        // = 0.1 / (0.1 * 0.5) = 2 L
        expect(sample.volume_as_used_value).toBeCloseTo(2, 6);
      });
    });

    describe('calculateValues - purity case', () => {
      it('should trigger all three calculations when purity changes', () => {
        const spyVolumeByMass = sinon.spy(sample, 'calculateVolumeByMass');
        const spyAmountAsUsed = sinon.spy(sample, 'calculateAmountAsUsed');
        const spyAmountAsUsedMass = sinon.spy(sample, 'calculateAmountAsUsedMass');

        sample.base_volume_as_used_value = 1;
        sample.base_molarity_value = 0.1;
        sample.concentration_value = 1000;
        sample.base_amount_as_used_mass_value = 100;

        sample.calculateValues('purity');

        expect(spyVolumeByMass.called).toBe(true);
        expect(spyAmountAsUsed.called).toBe(true);
        expect(spyAmountAsUsedMass.called).toBe(true);
      });
    });

    describe('calculateValues - concentration case', () => {
      it('should prioritize mass recalculation when volume is available', () => {
        const spyAmountAsUsedMass = sinon.spy(sample, 'calculateAmountAsUsedMass');
        const spyVolumeByMass = sinon.spy(sample, 'calculateVolumeByMass');

        sample.base_volume_as_used_value = 1;
        sample.base_amount_as_used_mass_value = 100;

        sample.calculateValues('concentration');

        expect(spyAmountAsUsedMass.called).toBe(true);
        expect(spyVolumeByMass.called).toBe(false);
      });

      it('should recalculate volume from mass when volume is not available', () => {
        const spyAmountAsUsedMass = sinon.spy(sample, 'calculateAmountAsUsedMass');
        const spyVolumeByMass = sinon.spy(sample, 'calculateVolumeByMass');

        sample.base_volume_as_used_value = 0;
        sample.base_amount_as_used_mass_value = 100;

        sample.calculateValues('concentration');

        expect(spyAmountAsUsedMass.called).toBe(false);
        expect(spyVolumeByMass.called).toBe(true);
      });
    });

    describe('calculateValues - amount_as_used_mol case', () => {
      it('should trigger volume, mass, and activity calculations when amount_mol changes', () => {
        const spyVolumeByAmount = sinon.spy(sample, 'calculateVolumeByAmount');
        const spyAmountAsUsedMass = sinon.spy(sample, 'calculateAmountAsUsedMass');
        const spyActivity = sinon.spy(sample, 'calculateActivity');

        sample.base_amount_as_used_mol_value = 0.2;
        sample.base_molarity_value = 0.1;
        sample.concentration_value = 1000;
        sample.purity = 0.5;

        sample.calculateValues('amount_as_used_mol');

        expect(spyVolumeByAmount.called).toBe(true);
        expect(spyAmountAsUsedMass.called).toBe(true);
        expect(spyActivity.called).toBe(true);
      });
    });

    describe('calculateValues - activity case with priority logic', () => {
      describe('calculateVolumeFromActivity', () => {
        it('should use activity_per_volume if available (Priority 1)', () => {
          const spyVolumeByActivity = sinon.spy(sample, 'calculateVolumeByActivity');
          const spyVolumeByMass = sinon.spy(sample, 'calculateVolumeByMass');

          sample.base_activity_value = 100;
          sample.base_activity_per_volume_value = 100;

          sample.calculateVolumeFromActivity();

          expect(spyVolumeByActivity.called).toBe(true);
          expect(spyVolumeByMass.called).toBe(false);
        });

        it('should use concentration if activity_per_volume is not available (Priority 2)', () => {
          const spyVolumeByActivity = sinon.spy(sample, 'calculateVolumeByActivity');
          const spyVolumeByMass = sinon.spy(sample, 'calculateVolumeByMass');

          sample.base_activity_value = 100;
          sample.base_activity_per_volume_value = 0;
          sample.concentration_value = 1000;
          sample.base_amount_as_used_mass_value = 100;

          sample.calculateVolumeFromActivity();

          expect(spyVolumeByActivity.called).toBe(false);
          expect(spyVolumeByMass.called).toBe(true);
        });
      });

      describe('calculateMassFromActivity', () => {
        it('should use activity_per_mass if available (Priority 1)', () => {
          const spyMassByActivity = sinon.spy(sample, 'calculateMassByActivity');
          const spyAmountAsUsedMass = sinon.spy(sample, 'calculateAmountAsUsedMass');

          sample.base_activity_value = 100;
          sample.base_activity_per_mass_value = 50;

          sample.calculateMassFromActivity();

          expect(spyMassByActivity.called).toBe(true);
          expect(spyAmountAsUsedMass.called).toBe(false);
        });

        it('should use concentration if activity_per_mass is not available (Priority 2)', () => {
          const spyMassByActivity = sinon.spy(sample, 'calculateMassByActivity');
          const spyAmountAsUsedMass = sinon.spy(sample, 'calculateAmountAsUsedMass');

          sample.base_activity_value = 100;
          sample.base_activity_per_mass_value = 0;
          sample.concentration_value = 1000;
          sample.base_volume_as_used_value = 1;

          sample.calculateMassFromActivity();

          expect(spyMassByActivity.called).toBe(false);
          expect(spyAmountAsUsedMass.called).toBe(true);
        });
      });

      describe('calculateAmountMolFromActivity', () => {
        it('should always calculate amount_mol', () => {
          const spyAmountAsUsed = sinon.spy(sample, 'calculateAmountAsUsed');

          sample.base_volume_as_used_value = 1;
          sample.base_molarity_value = 0.1;

          sample.calculateAmountMolFromActivity();

          expect(spyAmountAsUsed.called).toBe(true);
        });
      });

      it('should call all three calculation functions when activity changes', () => {
        const spyVolumeFromActivity = sinon.spy(sample, 'calculateVolumeFromActivity');
        const spyMassFromActivity = sinon.spy(sample, 'calculateMassFromActivity');
        const spyAmountMolFromActivity = sinon.spy(sample, 'calculateAmountMolFromActivity');

        sample.base_activity_value = 100;

        sample.calculateValues('activity');

        expect(spyVolumeFromActivity.called).toBe(true);
        expect(spyMassFromActivity.called).toBe(true);
        expect(spyAmountMolFromActivity.called).toBe(true);
      });
    });

    describe('calculateMassByActivity', () => {
      it('should calculate mass from activity and activity_per_mass', () => {
        sample.base_activity_value = 100;
        sample.base_activity_per_mass_value = 50;

        sample.calculateMassByActivity();

        // mass = activity / activity_per_mass
        // = 100 / 50 = 2 g
        expect(sample.amount_as_used_mass_value).toBeCloseTo(2, 6);
      });

      it('should return early if activity is 0', () => {
        sample.base_activity_value = 0;
        sample.base_activity_per_mass_value = 50;

        const initialMass = sample.amount_as_used_mass_value;
        sample.calculateMassByActivity();

        expect(sample.amount_as_used_mass_value).toBe(initialMass);
      });

      it('should return early if activity_per_mass is 0', () => {
        sample.base_activity_value = 100;
        sample.base_activity_per_mass_value = 0;

        const initialMass = sample.amount_as_used_mass_value;
        sample.calculateMassByActivity();

        expect(sample.amount_as_used_mass_value).toBe(initialMass);
      });
    });

    describe('Purity getter methods', () => {
      it('should return purity-adjusted concentration', () => {
        sample.concentration_value = 1000;
        sample.purity = 0.75;

        const concentrationByPurity = sample.concentration_by_purity;

        // concentration * purity = 1000 * 0.75 = 750
        expect(parseFloat(concentrationByPurity)).toBeCloseTo(750, 6);
      });

      it('should return purity-adjusted molarity', () => {
        sample.molarity_value = 0.1;
        sample.purity = 0.5;

        const molarityByPurity = sample.molarity_by_purity;

        // molarity * purity = 0.1 * 0.5 = 0.05
        expect(parseFloat(molarityByPurity)).toBeCloseTo(0.05, 6);
      });

      it('should return purity-adjusted activity_per_mass', () => {
        sample.activity_per_mass_value = 100;
        sample.purity = 0.8;

        const activityPerMassByPurity = sample.activity_per_mass_by_purity;

        // activity_per_mass * purity = 100 * 0.8 = 80
        expect(parseFloat(activityPerMassByPurity)).toBeCloseTo(80, 6);
      });

      it('should return empty string if base value is not set', () => {
        sample.concentration_value = undefined;
        sample.purity = 0.75;

        const concentrationByPurity = sample.concentration_by_purity;

        expect(concentrationByPurity).toBe('');
      });
    });

    describe('Setter triggers calculateValues', () => {
      it('should trigger calculations when purity setter is called', () => {
        const spy = sinon.spy(sample, 'calculateValues');

        sample.purity = 0.75;

        expect(spy.calledWith('purity')).toBe(true);
      });

      it('should trigger calculations when concentration_value setter is called', () => {
        const spy = sinon.spy(sample, 'calculateValues');

        sample.concentration_value = 1500;

        expect(spy.calledWith('concentration')).toBe(true);
      });

      it('should trigger calculations when volume_as_used_value setter is called', () => {
        const spy = sinon.spy(sample, 'calculateValues');

        sample.volume_as_used_value = 2;

        expect(spy.calledWith('volume_as_used')).toBe(true);
      });

      it('should trigger calculations when molarity_value setter is called', () => {
        const spy = sinon.spy(sample, 'calculateValues');

        sample.molarity_value = 0.2;

        expect(spy.calledWith('molarity')).toBe(true);
      });
    });

    describe('Non-enzyme samples', () => {
      it('should return null for calculateValues if not an enzyme', () => {
        sample.function_or_application = 'other';

        const result = sample.calculateValues('volume_as_used');

        expect(result).toBeNull();
      });
    });
  });
});
