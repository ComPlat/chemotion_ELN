import expect from 'expect';
import Component from '../../../../../app/packs/src/models/Component.js';
import Molecule from '../../../../../app/packs/src/models/Molecule.js';

describe('Component', () => {
  let component;

  beforeEach(() => {
    component = new Component({});
    component.molecular_weight = 18.010564684; // Set a default molecular weight
    component.purity = 1.0; // Set a default purity
  });

  describe('handleVolumeChange', () => {
    it('should set volume and calculate amount from density when material group is liquid', () => {
      const amount = { unit: 'l', value: 2 };
      component.material_group = 'liquid';
      component.density = 1.0; //1 g/mL

      component.handleVolumeChange(amount, 200);

      console.log('--------------------component component.amount_mol:', component.amount_mol);

      expect(component.amount_l).toEqual(2);
      expect(component.amount_g).toEqual(2000); // 2 liters * 1 g/mL = 2000 g
      // expect(component.amount_mol).toBeCloseTo(111.07, 0.01); // 2000g / 18.01g/mol
    });

    it('should set volume and calculate amount and molarity, when material group is liquid, and stock (starting' +
      ' concentration) is given', () => {
      const amount = { unit: 'l', value: 2 };
      component.material_group = 'liquid';
      component.starting_molarity_value = 0.1; // Molarity of 0.1 mmol/L

      component.handleVolumeChange(amount, 200);

      expect(component.amount_mol).toEqual(0.0002); // 0.1 mmol/L * 2 liters = 0.2 mmol = 0.0002 mol
      expect(component.molarity_value).toEqual(0.000001); // 0.2 mmol / 200 liters = 0.001 mmol/L = 0.000001 mol/L
    });
  });

  describe('handleAmountChange', () => {
    it('should set amount in mol and calculate volume if stock (starting concentration), when material group is' +
      ' liquid', () => {
      const amount = { unit: 'mol', value: 2 };
      component.material_group = 'liquid';
      component.starting_molarity_value = 1.0; // 1 Molar solution
      component.purity = 1.0;

      component.handleAmountChange(amount, 2);

      expect(component.amount_mol).toEqual(2);
      expect(component.amount_l).toEqual(2); // 2 mol / (1 mol/L * 1) = 2 L
    });

    it('should set amount in mol and calculate volume if density is given, when material group is liquid', () => {
      const amount = { unit: 'mol', value: 2 };
      component.material_group = 'liquid';
      component.density = 1.0; //1 g/mL
      component.purity = 1.0; // 100% purity

      component.handleAmountChange(amount, 2);

      // amount_l = (amount_mol * molecule_molecular_weight * purity) / (density * 1000)
      // So, amount_l = (2 mol * 18.010564684 g/mol * 1) / (1000 g/L)
      const expectedAmountL = (2 * 18.010564684) / 1000; // = 0.036021129368 L (approximately)

      expect(component.amount_mol).toEqual(2);
      expect(component.amount_l).toBeCloseTo(expectedAmountL, 6); // Check to a precision of 6 decimal places
    });
  });

  describe('handleDensityChange', () => {
    it('should set density and calculate amount when volume is known, when material group is liquid', () => {
      const density = { unit: 'g/ml', value: 2.0 };
      component.material_group = 'liquid';
      component.amount_l = 2.0;

      component.handleDensityChange(density, false, 2);

      // amount_g = (amount_l * 1000) * density;
      // amount_mol = (amount_g * purity) / molecule_molecular_weight;
      const expectedAmountG = component.amount_l * 1000 * density.value; // 2 L * 1000 g/L * 2.0 = 4000 g
      const expectedAmountMol = expectedAmountG / component.molecular_weight; // 4000 g / 18.010564684 g/mol

      expect(component.density).toEqual(2.0);
      expect(component.amount_g).toEqual(expectedAmountG); // 4000 g
      expect(component.amount_mol).toBeCloseTo(expectedAmountMol, 0.01); // Approximately 222.1 mol
    });

    it('should set density and calculate volume when amount is known, when material group is liquid', () => {
      component.amount_mol = 1.0; // 1 mole of the substance
      component.molecular_weight = 18.010564684; // g/mol
      const density = { unit: 'g/ml', value: 2.0 }; // g/mL (which is equivalent to 2000 g/L)
      const purity = 1.0; // 100% purity

      component.handleDensityChange(density, false, 2);

      // amount_l = (amount_mol * molecule_molecular_weight * purity) / (density * 1000)
      // amount_l = (1.0 mol * 18.010564684 g/mol * 1.0) / (2.0 g/mL * 1000)
      const expectedAmountL = (component.amount_mol * component.molecule_molecular_weight * purity) / (component.density * 1000);

      expect(component.density).toEqual(2.0);
      expect(component.amount_l).toBeCloseTo(expectedAmountL, 0.01); // Allow a small margin for floating-point arithmetic
    });
  });

  describe('setPurity', () => {
    it('should set purity and adjust amount_mol accordingly', () => {
      component.molarity_value = 1.0;
      component.setPurity(0.9, 2); // Setting purity to 0.9

      expect(component.purity).toEqual(0.9);
      expect(component.amount_mol).toEqual(1.8); // 1 mol/L * 2L * 0.9 purity = 1.8 mol
    });

    it('should not set purity if it is out of bounds', () => {
      component.setPurity(1.1, 2); // Invalid purity (> 1)
      expect(component.purity).not.toEqual(1.1);

      component.setPurity(-0.5, 2); // Invalid purity (< 0)
      expect(component.purity).not.toEqual(-0.5);
    });
  });

  describe('serializeComponent', () => {
    it('should return a serialized object of the  component', () => {
      component.id = 1;
      component.name = 'Test Component';
      component.position = 1;
      component.amount_mol = 2.0;
      component.amount_g = 20.0;
      component.amount_l = 1.5;
      component.density = 1.2;
      component.molarity_value = 0.5;
      component.starting_molarity_value = 0.1;
      component.equivalent = 1.0;
      component.parent_id = 2;
      component.material_group = 'solid';
      component.purity = 0.9;

      const serialized = component.serializeComponent();

      expect(serialized).toEqual({
        id: 1,
        name: 'Test Component',
        position: 1,
        component_properties: {
          amount_mol: 2.0,
          amount_g: 20.0,
          amount_l: 1.5,
          density: 1.2,
          molarity_unit: 'M',
          molarity_value: 0.5,
          starting_molarity_value: 0.1,
          starting_molarity_unit: undefined, // Not set in this case
          molecule_id: 101,
          equivalent: 1.0,
          parent_id: 2,
          material_group: 'solid',
          reference: undefined, // Not set in this case
          purity: 0.9,
        }
      });
    });
  });
});
