import ReactionFactory from 'factories/ReactionFactory';
import expect from 'expect';
import { beforeEach, describe, it } from 'mocha';
import SampleFactory from 'factories/SampleFactory';

describe('Reaction', () => {
  let reaction;
  let materials;
  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    materials = await SampleFactory.build('reactionConcentrations.water_100g');
  });

  describe('solvent and purification concentrations', () => {
    it('should calculate solvent concentration correctly', () => {
      reaction.solvents = [materials];
      const amountLiters = 2;
      const result = reaction.totalVolumeForMaterialGroup('solvents', amountLiters);
      expect(result).toBe('100.0%');
    });

    it('should calculate purification solvent concentration correctly', () => {
      reaction.purification_solvents = [materials];
      const amountLiters = 2;
      const result = reaction.totalVolumeForMaterialGroup('purification_solvents', amountLiters);
      expect(result).toBe('100.0%');
    });

    it('should calculate purification solvent concentration correctly with 3 solvents', () => {
      reaction.purification_solvents = [materials, materials, materials];
      const amountLiters = 2;
      const result = reaction.totalVolumeForMaterialGroup('purification_solvents', amountLiters);
      expect(result).toBe('33.3%');
    });

    it('should calculate purification solvent concentration correctly with 2 solvents', () => {
      reaction.purification_solvents = [materials, materials];
      const amountLiters = 2;
      const result = reaction.totalVolumeForMaterialGroup('purification_solvents', amountLiters);
      expect(result).toBe('50.0%');
    });

    it('should return "n.d." if solvent volume is 0', () => {
      reaction.solvents = [];
      const amountLiters = 20;
      const result = reaction.totalVolumeForMaterialGroup('solvents', amountLiters);
      expect(result).toBe('n.d.');
    });

    it('should return "n.d." if purification solvent volume is 0', () => {
      reaction.purification_solvents = [];
      const amountLiters = 20;
      const result = reaction.totalVolumeForMaterialGroup('purification_solvents', amountLiters);
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
  });
});

