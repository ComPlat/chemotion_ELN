/* global describe, context, it */

import expect from 'expect';
import SampleFactory from 'factories/SampleFactory';
import Sample from 'src/models/Sample.js';
import Component from 'src/models/Component';

describe('Sample', async () => {
  const referenceSample = await SampleFactory.build('SampleFactory.water_100g');
  const product = await SampleFactory.build('SampleFactory.water_100g');

  describe('Sample.calculateMaxAmount()', () => {
    context('when input is valid', () => {
      it('returns amount of 100', () => {
        product.coefficient = 1;
        referenceSample.coefficient = 1;
        product.calculateMaxAmount(referenceSample);

        expect(product.maxAmount).toBeCloseTo(100, 5);
      });
    });

    context('when product coefficient is two', () => {
      it('returns amount of 200', () => {
        product.coefficient = 2;
        referenceSample.coefficient = 1;
        product.calculateMaxAmount(referenceSample);
        expect(product.maxAmount).toBeCloseTo(200, 5);
      });
    });

    context('when product coefficient is zero', () => {
      it('amount is 100 because zero coefficient was set to one', () => {
        product.coefficient = 0;
        referenceSample.coefficient = 1;
        product.calculateMaxAmount(referenceSample);
        expect(product.maxAmount).toBeCloseTo(100, 5);
      });
    });

    context('when reference coefficient is four', () => {
      it('returns amount of 25', () => {
        product.coefficient = 1;
        referenceSample.coefficient = 4;
        product.calculateMaxAmount(referenceSample);

        expect(product.maxAmount).toBeCloseTo(25, 5);
      });
    });
  });

  describe('Sample.copyFromSampleAndCollectionId()', () => {
    it('should copy amount_value when sample_type is Mixture', () => {
      const sample = new Sample();
      sample.sample_type = 'Mixture';
      sample.amount_value = 50;
      sample.buildCopy = () => new Sample(); // Ensure buildCopy returns a Sample instance

      const collection_id = 123;
      const newSample = Sample.copyFromSampleAndCollectionId(sample, collection_id);

      expect(newSample.amount_value).toEqual(50);
    });

    it('should NOT copy amount_value when sample_type is not Mixture', () => {
      const sample = new Sample();
      sample.sample_type = 'Solid';
      sample.amount_value = 50;
      sample.buildCopy = () => new Sample(); // Ensure buildCopy returns a Sample instance

      const collection_id = 123;
      const newSample = Sample.copyFromSampleAndCollectionId(sample, collection_id);

      expect(newSample.amount_value).toBeUndefined();
    });
  });

  describe('Sample.isMixtureLiquid()', () => {
    it('returns false when not a mixture', () => {
      const s = new Sample();
      s.sample_type = 'Solid';
      expect(s.isMixtureLiquid()).toBe(false);
    });

    it('returns true when solvents are present', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.solvent = [{ id: 1 }];
      expect(s.isMixtureLiquid()).toBe(true);
    });

    it('returns true when total volume is present', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.amount_unit = 'l';
      s.amount_value = 1;
      expect(s.isMixtureLiquid()).toBe(true);
    });

    it('returns true when any component is liquid', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.components = [{ material_group: 'solid' }, { material_group: 'liquid' }];
      expect(s.isMixtureLiquid()).toBe(true);
    });
  });

  describe('Sample.preferred_label', () => {
    it('uses external label when present', () => {
      const s = new Sample();
      s.external_label = 'EXT-123';
      s.molecule = { iupac_name: 'IUPAC' };
      expect(s.preferred_label).toBe('EXT-123');
    });

    it('falls back to molecule iupac_name when no external label', () => {
      const s = new Sample();
      s.molecule = { iupac_name: 'IUPAC' };
      expect(s.preferred_label).toBe('IUPAC');
    });
  });

  describe('Sample.calculateMixtureVolume()', () => {
    it('returns 0 for non-mixture or invalid input', () => {
      const s = new Sample();
      s.sample_type = 'Solid';
      expect(s.calculateMixtureVolume(100)).toBe(0);
    });

    it('uses density to compute volume when available', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.density = 1.0; // g/ml
      const volume = s.calculateMixtureVolume(100); // g
      expect(volume).toBeCloseTo(0.1, 6); // 100 g / (1 g/ml) / 1000 = 0.1 L
    });

    it('uses molarity and molecular weight when density is not available', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.density = 0; // not used
      s.molarity_value = 2; // mol/L
      const volume = s.calculateMixtureVolume(10, 0.5, 100); // (10*0.5)/(2*100) = 0.025 L
      expect(volume).toBeCloseTo(0.025, 6);
    });

    it('returns 0 when neither density nor valid molarity/mw are provided', () => {
      const s = new Sample();
      s.sample_type = 'Mixture';
      s.density = 0;
      s.molarity_value = 0;
      const volume = s.calculateMixtureVolume(10, 1.0, null);
      expect(volume).toBe(0);
    });
  });

  describe('Sample.calculateMixtureAmountMol()', () => {
    it('returns 0 when no reference component', () => {
      const s = new Sample();
      expect(s.calculateMixtureAmountMol()).toBe(0);
    });

    it('returns reference amount_mol when reference changed flag is set', () => {
      const s = new Sample();
      const refComp = new Component({});
      refComp.amount_mol = 3;
      refComp.reference = true;
      refComp.component_properties = {};
      s.initialComponents([refComp]);
      s.sample_details = { reference_component_changed: true };
      expect(s.calculateMixtureAmountMol()).toBe(3);
    });

    it('calculates amount_mol as total mass / relative MW when available', () => {
      const s = new Sample();
      const refComp = new Component({});
      refComp.reference = true;
      refComp.amount_mol = 1;
      refComp.component_properties = { relative_molecular_weight: 18 };
      // Provide convenience getter compatibility
      refComp.relative_molecular_weight = 18;
      s.initialComponents([refComp]);
      s.sample_type = 'Mixture';
      s.amount_unit = 'g';
      s.amount_value = 36;
      s.sample_details = { reference_component_changed: false };
      expect(s.calculateMixtureAmountMol()).toBeCloseTo(2, 6);
    });

    it('falls back to reference amount_mol or "n.d" when data missing', () => {
      const s1 = new Sample();
      const ref1 = new Component({});
      ref1.reference = true;
      ref1.amount_mol = 1.5;
      ref1.component_properties = { relative_molecular_weight: 0 };
      ref1.relative_molecular_weight = 0;
      s1.initialComponents([ref1]);
      expect(s1.calculateMixtureAmountMol()).toBe(1.5);

      const s2 = new Sample();
      const ref2 = new Component({});
      ref2.reference = true;
      ref2.component_properties = {};
      s2.initialComponents([ref2]);
      expect(s2.calculateMixtureAmountMol()).toBe('n.d');
    });
  });

  describe('Sample.getReferenceRelativeMolecularWeight()', () => {
    it('returns the relative molecular weight from reference component', () => {
      const s = new Sample();
      const ref = { relative_molecular_weight: 42 };
      expect(s.getReferenceRelativeMolecularWeight(ref)).toBe(42);
    });
  });

  describe('Sample.calculateAmountBasedOnWeightPercentage()', () => {
    it('returns this when targetAmount is null or invalid', () => {
      const s = new Sample();
      s.weight_percentage = 0.3;

      expect(s.calculateAmountBasedOnWeightPercentage(null)).toBe(s);
      expect(s.calculateAmountBasedOnWeightPercentage({})).toBe(s);
      expect(s.calculateAmountBasedOnWeightPercentage({ value: 0 })).toBe(s);
      expect(s.calculateAmountBasedOnWeightPercentage({ value: -5, unit: 'g' })).toBe(s);
    });

    it('returns this when targetAmount has no unit', () => {
      const s = new Sample();
      s.weight_percentage = 0.3;
      const before = s.amount_value;

      const ret = s.calculateAmountBasedOnWeightPercentage({ value: 10 });

      expect(ret).toBe(s);
      expect(s.amount_value).toBe(before);
    });

    it('calculates amount based on weight percentage and sets equivalent to 0 for non-reference', () => {
      const s = new Sample();
      s.weight_percentage = 0.25; // 25%
      s.reference = false;
      let setAmountCalled = false;
      let setAmountArg = null;
      s.setAmount = (arg) => { setAmountCalled = true; setAmountArg = arg; };

      const ret = s.calculateAmountBasedOnWeightPercentage({ value: 20, unit: 'g' });

      expect(ret).toBe(s);
      expect(setAmountCalled).toBe(true);
      expect(setAmountArg).toEqual({ value: 5, unit: 'g' }); // 20 * 0.25 = 5
      expect(s.equivalent).toBe(0);
    });

    it('does not modify equivalent when sample is reference material', () => {
      const s = new Sample();
      s.weight_percentage = 0.4;
      s.reference = true;
      s.equivalent = 1;
      let setAmountCalled = false;
      let setAmountArg = null;
      s.setAmount = (arg) => { setAmountCalled = true; setAmountArg = arg; };

      s.calculateAmountBasedOnWeightPercentage({ value: 15, unit: 'mg' });

      expect(setAmountCalled).toBe(true);
      expect(setAmountArg).toEqual({ value: 6, unit: 'mg' }); // 15 * 0.4 = 6
      expect(s.equivalent).toBe(1); // Should remain unchanged
    });

    it('does nothing when weight_percentage is 0 or not set', () => {
      const s = new Sample();
      s.weight_percentage = 0;
      let setAmountCalled = false;
      s.setAmount = () => { setAmountCalled = true; };

      s.calculateAmountBasedOnWeightPercentage({ value: 10, unit: 'g' });

      expect(setAmountCalled).toBe(false);
    });
  });

  describe('Sample.updateYieldForWeightPercentageReference()', () => {
    it('returns this immediately when not weight_percentage_reference', () => {
      const s = new Sample();
      s.weight_percentage_reference = false;
      const originalEquivalent = s.equivalent;
      
      const ret = s.updateYieldForWeightPercentageReference();

      expect(ret).toBe(s);
      expect(s.equivalent).toBe(originalEquivalent);
    });

    it('sets equivalent to "n.d" when amountType is target', () => {
      const s = new Sample();
      s.weight_percentage_reference = true;
      s.amountType = 'target';

      const ret = s.updateYieldForWeightPercentageReference();

      expect(ret).toBe(s);
      expect(s.equivalent).toBe('n.d');
    });

    it('calculates equivalent when amountType is real and conversion is valid', () => {
      const s = new Sample();
      console.log("s before test:", s);
      s.weight_percentage_reference = true;
      s.amountType = 'real';
      s.target_amount_value = 10;
      // Mock amount_mol getter to return 1.5
      Object.defineProperty(s, 'amount_mol', {
        get: () => 1.5,
        configurable: true
      });
      s.convertGramToUnit = (value, unit) => {
        if (value === 10 && unit === 'mol') return 2;
        return null;
      };

      const ret = s.updateYieldForWeightPercentageReference();
      console.log("ret AFTER test:", ret);

      expect(ret).toBe(s);
      expect(s.equivalent).toEqual(0.75); // 1.5 / 2 = 0.75
    });

    it('caps equivalent at 1 when calculated yield exceeds 100%', () => {
      const s = new Sample();
      s.weight_percentage_reference = true;
      s.amountType = 'real';
      s.target_amount_value = 5;
      // Mock amount_mol getter to return 3
      Object.defineProperty(s, 'amount_mol', {
        get: () => 3,
        configurable: true
      });
      s.convertGramToUnit = () => 2; // Mock conversion to 2 mol

      const ret = s.updateYieldForWeightPercentageReference();

      expect(ret).toBe(s);
      expect(s.equivalent).toBe(1); // Should be capped at 1 (3/2 = 1.5 > 1)
    });

    it('sets equivalent to "n.d" when convertGramToUnit returns null', () => {
      const s = new Sample();
      s.weight_percentage_reference = true;
      s.amountType = 'real';
      s.target_amount_value = 10;
      s.convertGramToUnit = () => null;

      const ret = s.updateYieldForWeightPercentageReference();

      expect(ret).toBe(s);
      expect(s.equivalent).toBe('n.d');
    });

    it('sets equivalent to "n.d" when target_amount_value is 0 or negative', () => {
      const s = new Sample();
      s.weight_percentage_reference = true;
      s.amountType = 'real';
      s.target_amount_value = 0;
      s.convertGramToUnit = () => 2;

      const ret = s.updateYieldForWeightPercentageReference();

      expect(ret).toBe(s);
      expect(s.equivalent).toBe('n.d');
    });

    it('does nothing when amountType is neither target nor real', () => {
      const s = new Sample();
      s.weight_percentage_reference = true;
      s.amountType = 'unknown';
      const originalEquivalent = s.equivalent;

      const ret = s.updateYieldForWeightPercentageReference();

      expect(ret).toBe(s);
      expect(s.equivalent).toBe(originalEquivalent);
    });
  });
});
