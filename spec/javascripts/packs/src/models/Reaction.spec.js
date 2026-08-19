import ReactionFactory from 'factories/ReactionFactory';
import expect from 'expect';
import SampleFactory from 'factories/SampleFactory';
import Reaction from 'src/models/Reaction';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';

function randFloat(min, max, precision) {
  return Number.parseFloat((Math.random() * (max - min) + min).toFixed(precision));
}

function randFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randMaterialGroup() {
  return randFromArray(Reaction.materialGroups);
}

describe('Reaction', () => {
  let reaction;
  let material, materials;
  beforeEach(async() => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    material = await SampleFactory.build('reactionConcentrations.water_100g');
    materials = await SampleFactory.buildMany('Ethanol_5ml', 5);
  });
  describe('.calculateVolumeRatio', () => {
    it('returns nd if denominator is 0', () => {
      const result = reaction.calculateVolumeRatio(1, 0);
      expect(result).toBe('n.d.');
    });
    it('returns 0.0% if numerator is 0', () => {
      const result = reaction.calculateVolumeRatio(0, 1);
      expect(result).toBe('0.0%');
    });
    it('calculates the ratio correctly', () => {
      const result = reaction.calculateVolumeRatio(1, 2);
      expect(result).toBe('50.0%');
    });
  });

  describe('.findMaterialById', () => {
    it('returns the correct material', () => {
      const materialGroup = randMaterialGroup();
      reaction[materialGroup] = [...materials, material];
      const result = reaction.findMaterialById(material.id);
      expect(result).toEqual({ type: materialGroup, material });
    });
  });

  describe('.totalVolumeForMaterialGroup', () => {
    it('calculates the total volume for a material group correctly', () => {
      const materialGroup = randMaterialGroup();
      const amount1 = randFloat(1, 100, 5);
      const amount2 = randFloat(1, 100, 5);
      materials[1].real_amount_value = amount1;
      materials[2].real_amount_value = amount2;
      reaction[materialGroup] = [materials[1], materials[2]];
      const result = reaction.totalVolumeForMaterialGroup(materialGroup);
      expect(result).toBe(amount1 + amount2);
    });
  });

  describe('.volumeRatioByMaterialId', () => {
    it('calculate purification solvent and solvent ratios correctly', () => {
      materials[2].real_amount_value = 10;
      materials[4].real_amount_value = 995;
      reaction.solvents = [materials[3], materials[4]];
      reaction.purification_solvents = [materials[0], materials[1], materials[2]];

      expect(reaction.volumeRatioByMaterialId(materials[1].id)).toBe('25.0%');
      expect(reaction.volumeRatioByMaterialId(materials[3].id)).toBe('0.5%');
    });

    it('should return "n.d." if the material cannot be found', () => {
      const result = reaction.volumeRatioByMaterialId(0);
      expect(result).toBe('n.d.');
    });
  });

  describe('Reaction.updateMaxAmountOfProducts()', () => {
    context('when no referenceStartingMaterial is available', () => {
      it('no change of product maxAmounts', () => {
        reaction.starting_materials[0].reference = false;
        reaction.starting_materials[1].reference = false;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBe(undefined);
        expect(reaction.products[1].maxAmount).toBe(undefined);
      });
    });

    context('when first starting material is reference', () => {
      it('correct max amounts calculated (40,80)', () => {
        reaction.starting_materials[0].reference = true;
        reaction.starting_materials[1].reference = false;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBeCloseTo(40, 5);
        expect(reaction.products[1].maxAmount).toBeCloseTo(80, 5);
      });
    });
    context('when second starting material is reference', () => {
      it('correct max amounts calculated (200,400)', () => {
        reaction.starting_materials[0].reference = false;
        reaction.starting_materials[1].reference = true;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBeCloseTo(200, 5);
        expect(reaction.products[1].maxAmount).toBeCloseTo(400, 5);
      });
    });
    
    context('when no product present', () => {
      it('no changes happened', () => {
        reaction.starting_materials[0].reference = true;
        reaction.starting_materials[1].reference = false;
        const { products } = reaction;
        reaction.products = [];
        reaction.updateMaxAmountOfProducts();

        reaction.products = products;
      });
    });
  });
  describe('Reaction.buildCopy()', () => {
    it('should copy starting materials with _real_amount_value set to null', () => {
      const copy = reaction.buildCopy({ collection_id: 'newCollectionId' });
      expect(copy.starting_materials[0]._real_amount_value).toBe(null);
      expect(copy.starting_materials[1]._real_amount_value).toBe(null);
    });

    it('should handle empty starting_materials', () => {
      reaction.starting_materials = [];
      const copy = reaction.buildCopy({ collection_id: 'newCollectionId' });
      expect(copy.starting_materials).toEqual([]);
    });

    it('clears product amounts when keepAmounts=false (default)', () => {
      reaction.products[0]._real_amount_value = 1.5;
      reaction.products[0]._target_amount_value = 2.0;
      reaction.products[0].equivalent = 0.8;
      const copy = reaction.buildCopy({ collection_id: 'col1' });
      expect(copy.products[0]._real_amount_value).toBe(null);
      expect(copy.products[0]._target_amount_value).toBe(null);
      expect(copy.products[0].equivalent).toBe(null);
    });

    it('preserves product amounts when keepAmounts=true', () => {
      reaction.products[0]._real_amount_value = 1.5;
      reaction.products[0]._target_amount_value = 2.0;
      reaction.products[0].equivalent = 0.8;
      const copy = reaction.buildCopy({ collection_id: 'col1' }, true);
      expect(copy.products[0]._real_amount_value).toBe(1.5);
      expect(copy.products[0]._target_amount_value).toBe(2.0);
      expect(copy.products[0].equivalent).toBe(0.8);
    });
  });

  describe('Reaction.buildEmpty()', () => {
    it('should initialize volume as null', () => {
      const emptyReaction = Reaction.buildEmpty(1);
      expect(emptyReaction.volume).toBe(null);
    });

    it('should initialize use_reaction_volume as false', () => {
      const emptyReaction = Reaction.buildEmpty(1);
      expect(emptyReaction.use_reaction_volume).toBe(false);
    });

    it('should initialize lock_reaction_volume as false', () => {
      const emptyReaction = Reaction.buildEmpty(1);
      expect(emptyReaction.lock_reaction_volume).toBe(false);
    });
  });

  describe('Reaction.serialize()', () => {
    it('should include volume in serialized output', () => {
      reaction.volume = 0.5;
      const serialized = reaction.serialize();
      expect(serialized.volume).toBe(0.5);
    });

    it('should include use_reaction_volume in serialized output', () => {
      reaction.use_reaction_volume = true;
      const serialized = reaction.serialize();
      expect(serialized.use_reaction_volume).toBe(true);
    });

    it('should include lock_reaction_volume in serialized output', () => {
      reaction.lock_reaction_volume = true;
      const serialized = reaction.serialize();
      expect(serialized.lock_reaction_volume).toBe(true);
    });
  });

  describe('Reaction.calculateCombinedReactionVolume()', () => {
    it('calculates combined volume from solvents and materials', async() => {
      const solvent = await SampleFactory.build('reactionConcentrations.water_100g');
      const startingMaterial = await SampleFactory.build('reactionConcentrations.water_100g');
      const reactant = await SampleFactory.build('reactionConcentrations.water_100g');
      
      // Set amount_l by setting amount_value and amount_unit to 'l'
      // amount_l getter returns amount_value when amount_unit === 'l'
      solvent.amount_value = 0.1;
      solvent.amount_unit = 'l';
      startingMaterial.amount_value = 0.05;
      startingMaterial.amount_unit = 'l';
      reactant.amount_value = 0.03;
      reactant.amount_unit = 'l';
      
      reaction.solvents = [solvent];
      reaction.starting_materials = [startingMaterial];
      reaction.reactants = [reactant];
      reaction.products = [];

      const result = reaction.calculateCombinedReactionVolume();
      expect(result).toBeCloseTo(0.18, 5);
    });

    it('returns null when no volumes are present', () => {
      reaction.solvents = [];
      reaction.starting_materials = [];
      reaction.reactants = [];
      reaction.products = [];

      const result = reaction.calculateCombinedReactionVolume();
      expect(result).toBe(null);
    });

    it('includes SBMM reactant volume in combined volume', async() => {
      const solvent = await SampleFactory.build('reactionConcentrations.water_100g');
      const startingMaterial = await SampleFactory.build('reactionConcentrations.water_100g');
      const reactant = await SampleFactory.build('reactionConcentrations.water_100g');

      solvent.amount_value = 0.1;
      solvent.amount_unit = 'l';
      startingMaterial.amount_value = 0.05;
      startingMaterial.amount_unit = 'l';
      reactant.amount_value = 0.03;
      reactant.amount_unit = 'l';

      const sbmmReactant = new SequenceBasedMacromoleculeSample({
        volume_as_used_value: 0.02,
        volume_as_used_unit: 'L',
        amount_as_used_mass_value: 0,
        amount_as_used_mass_unit: 'g',
        amount_as_used_mol_value: 0,
        amount_as_used_mol_unit: 'mol',
        concentration_value: 0,
        concentration_unit: 'g/L',
        sequence_based_macromolecule: {},
      });

      reaction.solvents = [solvent];
      reaction.starting_materials = [startingMaterial];
      reaction.reactants = [reactant];
      reaction.reactant_sbmm_samples = [sbmmReactant];
      reaction.products = [];

      const result = reaction.calculateCombinedReactionVolume();
      expect(result).toBeCloseTo(0.2, 5);
    });

    it('excludes feedstock volume in a gas-scheme reaction', async () => {
      const solvent = await SampleFactory.build('reactionConcentrations.water_100g');
      const feedstock = await SampleFactory.build('reactionConcentrations.water_100g');
      const reactant = await SampleFactory.build('reactionConcentrations.water_100g');

      solvent.amount_value = 0.1;
      solvent.amount_unit = 'l';
      feedstock.amount_value = 0.05;
      feedstock.amount_unit = 'l';
      feedstock.gas_type = 'feedstock';
      reactant.amount_value = 0.03;
      reactant.amount_unit = 'l';

      reaction.gaseous = true;
      reaction.solvents = [solvent];
      reaction.starting_materials = [];
      reaction.reactants = [feedstock, reactant];
      reaction.products = [];

      const result = reaction.calculateCombinedReactionVolume();
      // 0.1 (solvent) + 0.03 (reactant); feedstock's 0.05 must be excluded.
      expect(result).toBeCloseTo(0.13, 5);
    });

    it('includes feedstock volume when the reaction is not gaseous', async () => {
      const solvent = await SampleFactory.build('reactionConcentrations.water_100g');
      const feedstock = await SampleFactory.build('reactionConcentrations.water_100g');

      solvent.amount_value = 0.1;
      solvent.amount_unit = 'l';
      feedstock.amount_value = 0.05;
      feedstock.amount_unit = 'l';
      feedstock.gas_type = 'feedstock';

      reaction.gaseous = false;
      reaction.solvents = [solvent];
      reaction.starting_materials = [];
      reaction.reactants = [feedstock];
      reaction.products = [];

      const result = reaction.calculateCombinedReactionVolume();
      expect(result).toBeCloseTo(0.15, 5);
    });

    it('includes catalyst volume in a gas-scheme reaction only when purity is non-zero', async () => {
      const solvent = await SampleFactory.build('reactionConcentrations.water_100g');
      const catalyst = await SampleFactory.build('reactionConcentrations.water_100g');

      solvent.amount_value = 0.1;
      solvent.amount_unit = 'l';
      catalyst.amount_value = 0.05;
      catalyst.amount_unit = 'l';
      catalyst.gas_type = 'catalyst';
      catalyst.purity = 0.5;

      reaction.gaseous = true;
      reaction.solvents = [solvent];
      reaction.starting_materials = [];
      reaction.reactants = [catalyst];
      reaction.products = [];

      const result = reaction.calculateCombinedReactionVolume();
      expect(result).toBeCloseTo(0.15, 5);
    });

    it('excludes catalyst volume in a gas-scheme reaction when purity is zero', async () => {
      const solvent = await SampleFactory.build('reactionConcentrations.water_100g');
      const catalyst = await SampleFactory.build('reactionConcentrations.water_100g');

      solvent.amount_value = 0.1;
      solvent.amount_unit = 'l';
      catalyst.amount_value = 0.05;
      catalyst.amount_unit = 'l';
      catalyst.gas_type = 'catalyst';
      catalyst.purity = 0;

      reaction.gaseous = true;
      reaction.solvents = [solvent];
      reaction.starting_materials = [];
      reaction.reactants = [catalyst];
      reaction.products = [];

      const result = reaction.calculateCombinedReactionVolume();
      // Catalyst's 0.05 L is excluded because purity is 0.
      expect(result).toBeCloseTo(0.1, 5);
    });
  });

  describe('Reaction.reactionVolumeForConcentration()', () => {
    it('uses explicit reaction volume when enabled and valid', () => {
      reaction.use_reaction_volume = true;
      reaction.volume = 0.5;
      reaction.calculateCombinedReactionVolume = () => 0.2;

      const result = reaction.reactionVolumeForConcentration();

      expect(result).toBe(0.5);
    });

    it('uses combined volume when explicit reaction volume is disabled', () => {
      reaction.use_reaction_volume = false;
      reaction.volume = 0.5;
      reaction.calculateCombinedReactionVolume = () => 0.2;

      const result = reaction.reactionVolumeForConcentration();

      expect(result).toBe(0.2);
    });

    it('falls back to combined volume when explicit reaction volume is invalid', () => {
      reaction.use_reaction_volume = true;
      reaction.volume = 0;
      reaction.calculateCombinedReactionVolume = () => 0.2;

      const result = reaction.reactionVolumeForConcentration();

      expect(result).toBe(0.2);
    });
  });

  describe('Reaction.hasValidReactionVolume', () => {
    it('returns true for a positive numeric volume', () => {
      reaction.volume = 0.5;
      expect(reaction.hasValidReactionVolume).toBe(true);
    });

    it('returns false when volume is null, empty, zero, or negative', () => {
      reaction.volume = null;
      expect(reaction.hasValidReactionVolume).toBe(false);
      reaction.volume = '';
      expect(reaction.hasValidReactionVolume).toBe(false);
      reaction.volume = 0;
      expect(reaction.hasValidReactionVolume).toBe(false);
      reaction.volume = -1;
      expect(reaction.hasValidReactionVolume).toBe(false);
    });
  });

  describe('Reaction.canUpdateConcentration()', () => {
    it('always allows updates when equivalents are unlocked', () => {
      reaction.use_reaction_volume = false;
      reaction.volume = null;
      expect(reaction.canUpdateConcentration(false)).toBe(true);
    });

    it('requires use_reaction_volume and a valid volume when equivalents are locked', () => {
      reaction.use_reaction_volume = true;
      reaction.volume = 0.5;
      expect(reaction.canUpdateConcentration(true)).toBe(true);

      reaction.use_reaction_volume = false;
      expect(reaction.canUpdateConcentration(true)).toBe(false);

      reaction.use_reaction_volume = true;
      reaction.volume = 0;
      expect(reaction.canUpdateConcentration(true)).toBe(false);
    });
  });

  describe('Reaction.storageGroupFor()', () => {
    it('returns reactant_sbmm_samples for SBMM materials in the reactants group', () => {
      const sbmmMaterial = { type: 'sequence_based_macromolecule_sample' };
      expect(Reaction.storageGroupFor(sbmmMaterial, 'reactants'))
        .toBe('reactant_sbmm_samples');
    });

    it('returns the original group for non-SBMM materials', () => {
      const sample = { type: 'sample' };
      expect(Reaction.storageGroupFor(sample, 'reactants')).toBe('reactants');
      expect(Reaction.storageGroupFor(sample, 'starting_materials'))
        .toBe('starting_materials');
    });

    it('returns the original group for SBMM materials outside reactants', () => {
      const sbmmMaterial = { type: 'sequence_based_macromolecule_sample' };
      expect(Reaction.storageGroupFor(sbmmMaterial, 'starting_materials'))
        .toBe('starting_materials');
    });
  });

  describe('Reaction.resetPreservedConcentrationExcept()', () => {
    it('clears preserveConcentration on all materials except the edited one', () => {
      reaction.starting_materials = [
        { id: 'edited', preserveConcentration: true },
        { id: 'a', preserveConcentration: true },
      ];
      reaction.reactants = [{ id: 'b', preserveConcentration: true }];
      reaction.products = [{ id: 'c', preserveConcentration: true }];

      // The array setters wrap plain objects into Sample instances, so we
      // need to work with the instances owned by the reaction.
      const edited = reaction.starting_materials[0];
      const [, other1] = reaction.starting_materials;
      const [other2] = reaction.reactants;
      const [product] = reaction.products;

      reaction.resetPreservedConcentrationExcept(edited);

      expect(edited.preserveConcentration).toBe(true);
      expect(other1.preserveConcentration).toBe(false);
      expect(other2.preserveConcentration).toBe(false);
      expect(product.preserveConcentration).toBe(false);
    });

    it('is a no-op when arrays are missing', () => {
      reaction._starting_materials = null;
      reaction._reactants = null;
      reaction._products = null;
      expect(() => reaction.resetPreservedConcentrationExcept({ id: 1 }))
        .not.toThrow();
    });
  });

  describe('Reaction.updateReferenceAmountForLockedEquivalents()', () => {
    const buildSample = (overrides = {}) => {
      const sample = {
        setAmount: (amount) => {
          sample.lastAmount = amount;
          sample.amount_value = amount.value;
          sample.amount_unit = amount.unit;
        },
      };
      return Object.assign(sample, overrides);
    };

    // Register the driver in the reaction so the reactant-membership guard
    // (which prevents products/solvents from rebasing the reference) passes.
    // A driver rebases the reference unless it is a product or solvent, so a
    // reactant-side driver just needs to be absent from those groups. Assign
    // the backing fields directly: the public setters coerce plain objects
    // into Sample instances, discarding our lightweight test doubles.
    const asReactant = (updatedSample) => {
      reaction._products = [];
      reaction._solvents = [];
      reaction._purification_solvents = [];
      return updatedSample;
    };

    it('rebases the reference amount when equivalents are locked', () => {
      const referenceSample = buildSample({ reference: true });
      const updatedSample = asReactant(buildSample({
        id: 'driver-1',
        reference: false,
        equivalent: 2,
        amount_mol: 0.5,
      }));

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        updatedSample,
        true
      );

      expect(referenceSample.lastAmount).toEqual({ value: 0.25, unit: 'mol' });
    });

    it('does nothing when equivalents are unlocked', () => {
      const referenceSample = buildSample({ reference: true });
      const updatedSample = asReactant(buildSample({
        id: 'driver-1',
        reference: false,
        equivalent: 2,
        amount_mol: 0.5,
      }));

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        updatedSample,
        false
      );

      expect(referenceSample.lastAmount).toBe(undefined);
    });

    it('does nothing when the candidate is not the reference sample', () => {
      const referenceSample = buildSample({ reference: false });
      const updatedSample = asReactant(buildSample({
        id: 'driver-1',
        reference: false,
        equivalent: 2,
        amount_mol: 0.5,
      }));

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        updatedSample,
        true
      );

      expect(referenceSample.lastAmount).toBe(undefined);
    });

    it('does nothing when the updated sample is itself the reference', () => {
      const referenceSample = buildSample({ reference: true });
      const updatedSample = asReactant(buildSample({
        id: 'driver-1',
        reference: true,
        equivalent: 2,
        amount_mol: 0.5,
      }));

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        updatedSample,
        true
      );

      expect(referenceSample.lastAmount).toBe(undefined);
    });

    it('does not rebase when the driver is a product', () => {
      const referenceSample = buildSample({ reference: true });
      // Under locked equivalents a product's mass field stays editable, so a
      // product can flow in as updatedSample. It must never rebase the
      // reference (its `equivalent` is a yield, not a stoichiometric ratio).
      const product = buildSample({
        id: 'product-1',
        reference: false,
        equivalent: 0.8,
        amount_mol: 0.4,
      });
      reaction._starting_materials = [];
      reaction._reactants = [];
      reaction._products = [product];

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        product,
        true
      );

      expect(referenceSample.lastAmount).toBe(undefined);
    });

    it('rebases when the driver is an SBMM reactant', () => {
      const referenceSample = buildSample({ reference: true });
      // SBMM reactants live in their own group but are stoichiometric
      // reactants, so an amount edit on one must still rebase the reference.
      const sbmmReactant = buildSample({
        id: 'sbmm-1',
        reference: false,
        equivalent: 2,
        amount_mol: 0.5,
      });
      reaction._products = [];
      reaction._solvents = [];
      reaction._purification_solvents = [];
      reaction._reactant_sbmm_samples = [sbmmReactant];

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        sbmmReactant,
        true
      );

      expect(referenceSample.lastAmount).toEqual({ value: 0.25, unit: 'mol' });
    });

    it('rebases an SBMM driver even when it shares an id with a reactant', () => {
      // Regular and SBMM reactants can share an id. Because the guard tests
      // membership by object identity (not id), that overlap is irrelevant and
      // a legitimate SBMM driver still rebases the reference.
      const referenceSample = buildSample({ reference: true });
      const sbmmReactant = buildSample({
        id: 'shared-id',
        reference: false,
        equivalent: 2,
        amount_mol: 0.5,
      });
      reaction._products = [];
      reaction._solvents = [];
      reaction._purification_solvents = [];
      reaction._reactants = [buildSample({ id: 'shared-id', reference: false, equivalent: 3, amount_mol: 9 })];
      reaction._reactant_sbmm_samples = [sbmmReactant];

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        sbmmReactant,
        true
      );

      expect(referenceSample.lastAmount).toEqual({ value: 0.25, unit: 'mol' });
    });

    it('rebases an SBMM driver even when it shares an id with a product', () => {
      // SBMM samples share the id space with regular samples, so an SBMM
      // reactant driver can collide with a product's id. The guard must key on
      // object identity, not id — otherwise the product match misclassifies the
      // SBMM driver as non-reactant and wrongly skips the rebase.
      const referenceSample = buildSample({ reference: true });
      const sbmmReactant = buildSample({
        id: 'shared-id',
        reference: false,
        equivalent: 2,
        amount_mol: 0.5,
      });
      reaction._products = [buildSample({ id: 'shared-id', reference: false, equivalent: 0.8, amount_mol: 0.4 })];
      reaction._solvents = [];
      reaction._purification_solvents = [];
      reaction._reactants = [];
      reaction._reactant_sbmm_samples = [sbmmReactant];

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        sbmmReactant,
        true
      );

      expect(referenceSample.lastAmount).toEqual({ value: 0.25, unit: 'mol' });
    });

    it('does nothing when equivalent or amount_mol is invalid', () => {
      const referenceSample = buildSample({ reference: true });

      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        asReactant(buildSample({ id: 'driver-1', equivalent: 0, amount_mol: 0.5 })),
        true
      );
      reaction.updateReferenceAmountForLockedEquivalents(
        referenceSample,
        asReactant(buildSample({ id: 'driver-2', equivalent: 2, amount_mol: Number.NaN })),
        true
      );

      expect(referenceSample.lastAmount).toBe(undefined);
    });
  });

  describe('Reaction.resetPreservedConcentrationExcept()', () => {
    it('clears preserveConcentration on every group, including SBMM reactants', () => {
      const sm = { id: 'sm', preserveConcentration: true };
      const sbmm = { id: 'sbmm', preserveConcentration: true };
      const product = { id: 'p', preserveConcentration: true };
      reaction._starting_materials = [sm];
      reaction._reactants = [];
      reaction._reactant_sbmm_samples = [sbmm];
      reaction._products = [product];

      reaction.resetPreservedConcentrationExcept();

      expect(sm.preserveConcentration).toBe(false);
      expect(sbmm.preserveConcentration).toBe(false);
      expect(product.preserveConcentration).toBe(false);
    });

    it('spares the edited sample', () => {
      const edited = { id: 'edited', preserveConcentration: true };
      const other = { id: 'other', preserveConcentration: true };
      reaction._starting_materials = [edited, other];
      reaction._reactants = [];
      reaction._reactant_sbmm_samples = [];
      reaction._products = [];

      reaction.resetPreservedConcentrationExcept(edited);

      expect(edited.preserveConcentration).toBe(true);
      expect(other.preserveConcentration).toBe(false);
    });
  });

  describe('Reaction.deriveVolumeFromSampleConcentration()', () => {
    it('sets volume, enables use_reaction_volume, and recalculates concentrations', () => {
      const sample = { amount_mol: 0.5 };
      let updateCalled = false;
      reaction.updateAllConcentrations = () => { updateCalled = true; };

      const result = reaction.deriveVolumeFromSampleConcentration(sample, 2);

      expect(result).toEqual({ volume: 0.25, useReactionVolume: true });
      expect(reaction.volume).toBe(0.25);
      expect(reaction.use_reaction_volume).toBe(true);
      expect(updateCalled).toBe(true);
    });

    it('returns null when the concentration is not positive', () => {
      reaction.updateAllConcentrations = () => {
        throw new Error('should not recalc');
      };
      const sample = { amount_mol: 0.5 };

      expect(reaction.deriveVolumeFromSampleConcentration(sample, 0)).toBe(null);
      expect(reaction.deriveVolumeFromSampleConcentration(sample, Number.NaN))
        .toBe(null);
    });

    it('returns null when amount_mol is missing or zero', () => {
      reaction.updateAllConcentrations = () => {
        throw new Error('should not recalc');
      };

      expect(reaction.deriveVolumeFromSampleConcentration({ amount_mol: 0 }, 2))
        .toBe(null);
      expect(reaction.deriveVolumeFromSampleConcentration({}, 2)).toBe(null);
      expect(reaction.deriveVolumeFromSampleConcentration(null, 2)).toBe(null);
    });
  });

  describe('Reaction.updateAllConcentrations()', () => {
    it('calls updateConcentrationFromSolvent for all materials', async() => {
      const material1 = await SampleFactory.build('reactionConcentrations.water_100g');
      const material2 = await SampleFactory.build('reactionConcentrations.water_100g');
      let material1Called = false;
      let material2Called = false;
      material1.updateConcentrationFromSolvent = (r) => {
        material1Called = true;
        expect(r).toBe(reaction);
      };
      material2.updateConcentrationFromSolvent = (r) => {
        material2Called = true;
        expect(r).toBe(reaction);
      };

      reaction.starting_materials = [material1];
      reaction.reactants = [material2];
      reaction.volume = 0.5;
      reaction.use_reaction_volume = false;

      reaction.updateAllConcentrations();

      expect(material1Called).toBe(true);
      expect(material2Called).toBe(true);
    });

    it('updates concentration for SBMM reactants', () => {
      const sbmmReactant = new SequenceBasedMacromoleculeSample({
        volume_as_used_value: 0.02,
        volume_as_used_unit: 'L',
        amount_as_used_mass_value: 0,
        amount_as_used_mass_unit: 'g',
        amount_as_used_mol_value: 0.02,
        amount_as_used_mol_unit: 'mol',
        concentration_value: 0,
        concentration_unit: 'g/L',
        concentration_rt_unit: 'mol/L',
        sequence_based_macromolecule: {},
      });

      reaction.starting_materials = [];
      reaction.reactants = [];
      reaction.products = [];
      reaction.reactant_sbmm_samples = [sbmmReactant];
      reaction.use_reaction_volume = true;
      reaction.volume = 0.5;

      reaction.updateAllConcentrations();

      expect(reaction.reactant_sbmm_samples[0].concentration_rt_value).toBeCloseTo(0.04, 8);
    });
  });
});
