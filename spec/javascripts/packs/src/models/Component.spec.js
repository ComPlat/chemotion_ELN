import Component from 'src/models/Component';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import expect from 'expect';
import { describe, it, beforeEach } from 'mocha';

describe('Component', () => {
  let component;

  beforeEach(() => {
    const mockMolecule = { id: 101, molecular_weight: 18.010564684 };

    // Create a new instance of Component for each test
    component = new Component({});
    component.purity = 1.0; // Set a default purity
    component.material_group = 'liquid';
    component.molecule = mockMolecule;
  });

  describe('has_density', () => {
    it('should return true when density > 0 and starting molarity value is 0', () => {
      component.density = 1.5;
      component.starting_molarity_value = 0;
      expect(component.has_density).toBe(true);
    });

    it('should return false when density <= 0 or starting molarity value is > 0', () => {
      component.density = 0;
      component.starting_molarity_value = 1;
      expect(component.has_density).toBe(false);
    });
  });

  describe('calculateVolumeForLiquid', () => {
    it('should calculate volume from density when density is provided', () => {
      component.amount_mol = 1; // 1 mol
      component.amount_l = 1; // 1 L
      component.calculateVolumeForLiquid(1); // Call with purity 1
      expect(component.amount_l).toBe(1);
    });

    it('should calculate volume from starting/stock concentration when stock is provided', () => {
      component.density = 0;
      component.starting_molarity_value = 0.5; // 1 M
      component.amount_mol = 2; // 1 mol
      component.amount_l = 1; // 1 L
      component.calculateVolumeForLiquid(1);
      expect(component.amount_l).toBe(2 / 0.5);
    });
  });

  describe('handleVolumeChange', () => {
    const amount = { value: 10, unit: 'ml' };
    const totalVolume = 2; // L
    const referenceComponent = null; // No reference component for simplicity

    it('should update volume and calculate amount when the component is liquid', () => {
      component.material_group = 'liquid';
      component.density = 1.5;

      const expectedAmountMol = (amount.value * component.density * 1000 * component.purity)
        / component.molecule.molecular_weight;

      component.handleVolumeChange(amount, totalVolume, referenceComponent);

      expect(component.amount_l).toBe(amount.value);
      expect(Math.abs(component.amount_mol - expectedAmountMol)).toBeLessThanOrEqual(0.0001);
    });

    it('should update volume and calculate amount when the component is solid', () => {
      component.material_group = 'solid';

      const expectedAmountMol = (amount.value * component.purity) / component.molecule_molecular_weight;

      component.handleVolumeChange(amount, totalVolume, referenceComponent);

      expect(component.amount_g).toBe(amount.value);
      expect(Math.abs(component.amount_mol - expectedAmountMol)).toBeLessThanOrEqual(0.0001);
    });
  });

  describe('handleConcentrationChange', () => {
    it('should handle starting concentration change', () => {
      const amount = { value: 2, unit: 'mol/l' };
      const totalVolume = 10; // L
      const referenceComponent = null; // No reference component

      component.handleConcentrationChange(
        amount,
        totalVolume,
        'startingConc',
        false,
        referenceComponent
      );
      expect(component.starting_molarity_value).toBe(amount.value);
      expect(component.molarity_value).toBe(0); // Should reset amount to 0
    });

    it('should handle target concentration change', () => {
      const amount = { value: 1, unit: 'mol/l' };
      const totalVolume = 10; // L
      const referenceComponent = null;

      component.handleConcentrationChange(
        amount,
        totalVolume,
        'targetConc',
        false,
        referenceComponent
      );
      expect(component.molarity_value).toBe(amount.value);
      expect(component.amount_mol).toBe(component.concn * totalVolume);
    });
  });

  describe('handleTotalVolumeChanges', () => {
    it('should handle total volume changes, when conc. is not locked and recalculate target conc.', () => {
      const totalVolume = 10; // L
      const referenceComponent = null; // No reference component
      component.amount_mol = 2;

      // Mock store state for unlocked concentration
      ComponentStore.getState = () => ({
        lockedComponents: [],
      });

      const expectedResult = component.amount_mol / totalVolume;

      component.handleTotalVolumeChanges(totalVolume, referenceComponent);
      expect(component.molarity_value).toEqual(expectedResult); // Concentration should be recalculated
    });

    it('should handle total volume changes when conc. is locked: recalculate amount and volume', () => {
      const totalVolume = 10; // L
      const referenceComponent = null;
      const originalMolarityValue = component.molarity_value;
      component.density = 1.5;

      // Mock store state for locked concentration
      ComponentStore.getState = () => ({
        lockedComponents: [component.id],
      });

      component.handleTotalVolumeChanges(totalVolume, referenceComponent);

      const expectedAmountMol = component.concn * totalVolume;
      const expectedAmountL = (component.amount_mol * component.molecule.molecular_weight)
        / (component.density * 1000 * component.purity);

      expect(component.molarity_value).toBe(originalMolarityValue); // Conc. shouldn't change
      expect(component.amount_mol).toEqual(expectedAmountMol); // but amount and volume should be recalculated
      expect(component.amount_l).toEqual(expectedAmountL);
    });
  });

  describe('handleAmountChange', () => {
    it('should set amount in mol and calculate volume if stock (starting concentration), when material group is'
      + ' liquid', () => {
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
      component.density = 1.0; // 1 g/mL
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
    it('should set density and reset other attributes of the component', () => {
      const density = { unit: 'g/ml', value: 2.0 };
      component.amount_l = 2.0;
      component.amount_mol = 0.5;
      component.purity = 0.5;

      component.handleDensityChange(density, false);

      expect(component.density).toEqual(2.0);
      expect(component.starting_molarity_value).toBe(0);

      // resetRowFields
      expect(component.amount_l).toBe(0);
      expect(component.amount_mol).toBe(0);
      expect(component.molarity_value).toBe(0);
      expect(component.equivalent).toBe(1.0);
      expect(component.purity).toBe(1.0);
    });
  });

  describe('setPurity', () => {
    it('should set purity correctly for liquid and adjust amount_mol', () => {
      component.amount_mol = 0.5;
      const prevAmountMol = component.amount_mol;
      const prevPurity = component.purity;
      const newPurity = 0.8;
      const totalVolume = 100;

      // Call setPurity and check if amount_mol is adjusted
      component.setPurity(newPurity, totalVolume, null, false, 'liquid');

      expect(component.purity).toEqual(newPurity);
      // amount_mol (corrected) = amount_mol (before correction) * purity(new)/purity(before correction)
      expect(component.amount_mol).toBeCloseTo((prevAmountMol * newPurity) / prevPurity, 0.0001);
    });

    it('should set purity correctly for solid and adjust amount_mol when lockAmountColumnSolids is true', () => {
      component.material_group = 'solid';
      component.amount_g = 50;
      const newPurity = 0.9;
      const lockAmountColumnSolids = true;
      const totalVolume = 1.0;

      // Call setPurity and check if amount_mol is adjusted
      component.setPurity(newPurity, totalVolume, null, lockAmountColumnSolids, 'solid');

      expect(component.purity).toEqual(newPurity);
      expect(Math.abs(component.amount_mol - (component.amount_g * newPurity) / component.molecule.molecular_weight))
        .toBeLessThanOrEqual(0.0001);
    });

    it('should set purity correctly for solid and adjust amount_g when lockAmountColumnSolids is false', () => {
      // mass is not locked
      // mass_g = (amount_mol * molecular_weight) / purity

      component.material_group = 'solid';
      component.amount_mol = 0.1;
      const newPurity = 0.8;
      const lockAmountColumnSolids = false;
      const totalVolume = 1.0;

      // Call setPurity and check if amount_g is adjusted
      component.setPurity(newPurity, totalVolume, null, lockAmountColumnSolids, 'solid');

      expect(component.purity).toEqual(newPurity);
      expect(Math.abs(component.amount_g - (component.amount_mol * component.molecule.molecular_weight) / newPurity))
        .toBeLessThanOrEqual(0.0001);
    });

    it('should not update amount_mol when purity is not valid (less than or equal to 0 or greater than 1)', () => {
      const prevPurity = component.purity;
      const prevAmountMol = component.amount_mol;

      // Try setting an invalid purity value (less than 0)
      component.setPurity(-0.1, 1.0, null, false, 'liquid');

      expect(component.purity).toEqual(prevPurity);
      expect(component.amount_mol).toEqual(prevAmountMol);

      // Try setting an invalid purity value (greater than 1)
      component.setPurity(1.2, 1.0, null, false, 'liquid');

      expect(component.purity).toEqual(prevPurity);
      expect(component.amount_mol).toEqual(prevAmountMol);
    });
  });

  describe('serializeComponent', () => {
    it('should return a serialized object of the  component', () => {
      // Create a mock molecule object
      const mockMolecule = { id: 101 };

      component.id = 1;
      component.name = 'Test Component';
      component.position = 1;
      component.amount_mol = 2.0;
      component.amount_g = 20.0;
      component.amount_l = 1.5;
      component.density = 1.2;
      component.molarity_unit = 'M';
      component.molarity_value = 0.5;
      component.starting_molarity_value = 0.1;
      component.equivalent = 1.0;
      component.parent_id = 2;
      component.material_group = 'solid';
      component.purity = 0.9;
      component.molecule = mockMolecule;

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

  describe('createFromSampleData', () => {
    let mockComponentData;
    let mockSample;
    const mockParentId = 'parent_123';
    const mockMaterialGroup = 'solid';

    beforeEach(() => {
      mockComponentData = {
        id: 'comp_123',
        name: 'Test Component',
        component_properties: {
          amount_mol: 0.1,
          amount_l: 0.05,
          amount_g: 2.5,
          density: 1.2,
          molarity_unit: 'M',
          molarity_value: 2.0,
          starting_molarity_value: 2.0,
          starting_molarity_unit: 'M',
          molecule_id: 'mol_123',
          equivalent: 1.0,
          parent_id: 'old_parent_123',
          material_group: 'old_solid',
          reference: true,
          purity: 0.95,
          molecule: {
            id: 'mol_123',
            iupac_name: 'Test Molecule',
            molecular_weight: 100
          }
        }
      };

      mockSample = {
        amount_l: 0.1
      };
    });

    it('creates a component with correct properties from sample data', () => {
      const component = Component.createFromSampleData(
        mockComponentData,
        mockParentId,
        mockMaterialGroup,
        mockSample
      );

      expect(component).toBeInstanceOf(Component);
      expect(component.parent_id).toBe(mockParentId);
      expect(component.material_group).toBe(mockMaterialGroup);
      expect(component.starting_molarity_value).toBe(mockComponentData.component_properties.molarity_value);
      expect(component.molarity_value).toBe(0);
      expect(component.reference).toBe(false);
      expect(component.id).toMatch(/^comp_/);
      expect(component.amount_g).toBe(mockComponentData.component_properties.amount_g);
      expect(component.amount_l).toBe(mockComponentData.component_properties.amount_l);

      // Update molecule comparison to check individual properties instead of full object
      expect(component.molecule.id).toBe(mockComponentData.component_properties.molecule.id);
      expect(component.molecule.iupac_name).toBe(mockComponentData.component_properties.molecule.iupac_name);
      expect(component.molecule.molecular_weight).toBe(mockComponentData.component_properties.molecule.molecular_weight);
    });

    it('handles liquid components correctly', () => {
      const liquidComponent = Component.createFromSampleData(
        mockComponentData,
        mockParentId,
        'liquid',
        mockSample
      );

      expect(liquidComponent.material_group).toBe('liquid');
      expect(liquidComponent.amount_l).toBe(mockComponentData.component_properties.amount_l);
    });

    it('handles solid components correctly', () => {
      const solidComponent = Component.createFromSampleData(
        mockComponentData,
        mockParentId,
        'solid',
        mockSample
      );

      expect(solidComponent.material_group).toBe('solid');
      expect(solidComponent.amount_g).toBe(mockComponentData.component_properties.amount_g);
    });

    it('generates unique IDs for each component', () => {
      const component1 = Component.createFromSampleData(
        mockComponentData,
        mockParentId,
        mockMaterialGroup,
        mockSample
      );
      const component2 = Component.createFromSampleData(
        mockComponentData,
        mockParentId,
        mockMaterialGroup,
        mockSample
      );

      expect(component1.id).not.toBe(component2.id);
    });

    it('preserves molecule data from the original component', () => {
      const component = Component.createFromSampleData(
        mockComponentData,
        mockParentId,
        mockMaterialGroup,
        mockSample
      );

      // Update molecule comparison to check individual properties instead of full object
      expect(component.molecule.id).toBe(mockComponentData.component_properties.molecule.id);
      expect(component.molecule.iupac_name).toBe(mockComponentData.component_properties.molecule.iupac_name);
      expect(component.molecule.molecular_weight).toBe(mockComponentData.component_properties.molecule.molecular_weight);
      expect(component.molecule.id).toBe(mockComponentData.component_properties.molecule_id);
    });
  });
});
