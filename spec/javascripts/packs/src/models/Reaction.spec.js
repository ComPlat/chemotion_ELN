import ReactionFactory from 'factories/ReactionFactory';
import expect from 'expect';
import { beforeEach, describe, it } from 'mocha';
import SampleFactory from 'factories/SampleFactory';
import Reaction from 'src/models/Reaction';

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
  });
});

