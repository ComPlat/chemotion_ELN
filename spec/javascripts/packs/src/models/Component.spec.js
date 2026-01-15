import Component from 'src/models/Component';
import ComponentStore from 'src/stores/alt/stores/ComponentStore';
import expect from 'expect';
import sinon from 'sinon';
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
      component.density = 1.0; // g/mL
      component.amount_mol = 2; // mol
      const purity = 1;

      component.calculateVolumeForLiquid(purity);

      // amount_l = (amount_mol * molecular_weight) / (density * 1000 * purity)
      const expectedAmountL = (component.amount_mol * component.molecule.molecular_weight)
        / (component.density * 1000 * purity);
      expect(component.amount_l).toBeCloseTo(expectedAmountL, 6);
    });

    it('should calculate volume from starting/stock concentration when stock is provided', () => {
      component.density = 0;
      component.starting_molarity_value = 0.5; // 0.5 M
      component.amount_mol = 2; // mol
      component.amount_l = 1;
      component.calculateVolumeForLiquid(1);
      expect(component.amount_l).toBe(2 / 0.5);
    });
  });

  describe('handleVolumeChange', () => {
    const amount = { value: 10, unit: 'ml' };
    const totalVolume = 2; // L

    it('should update volume and calculate amount when the component is liquid', () => {
      component.material_group = 'liquid';
      component.density = 1.5;

      const expectedAmountMol = (amount.value * component.density * 1000 * component.purity)
        / component.molecule.molecular_weight;

      component.handleVolumeChange(amount, totalVolume);

      expect(component.amount_l).toBe(amount.value);
      expect(Math.abs(component.amount_mol - expectedAmountMol)).toBeLessThanOrEqual(0.0001);
    });

    it('should update volume and calculate amount when the component is solid', () => {
      component.material_group = 'solid';

      const expectedAmountMol = (amount.value * component.purity) / component.molecule_molecular_weight;

      component.handleVolumeChange(amount, totalVolume);

      expect(component.amount_g).toBe(amount.value);
      expect(Math.abs(component.amount_mol - expectedAmountMol)).toBeLessThanOrEqual(0.0001);
    });
  });

  describe('handleConcentrationChange', () => {
    it('should handle starting concentration change', () => {
      const amount = { value: 2, unit: 'mol/l' };
      const totalVolume = 10; // L

      const previousMolarity = component.molarity_value;

      component.handleConcentrationChange(
        amount,
        totalVolume,
        'startingConc',
        false
      );
      expect(component.starting_molarity_value).toBe(amount.value);
      // Starting concentration change should not forcibly reset total concentration;
      // it only updates starting_molarity_* and leaves molarity_value unchanged.
      expect(component.molarity_value).toBe(previousMolarity);
    });

    it('should handle target concentration change', () => {
      const amount = { value: 1, unit: 'mol/l' };
      const totalVolume = 10; // L

      component.handleConcentrationChange(
        amount,
        totalVolume,
        'targetConc',
        false
      );
      expect(component.molarity_value).toBe(amount.value);
      expect(component.amount_mol).toBe(component.concn * totalVolume);
    });
  });

  describe('handleTotalVolumeChanges', () => {
    it('should handle total volume changes, when conc. is not locked and recalculate target conc.', () => {
      const totalVolume = 10; // L
      component.amount_mol = 2;

      // Mock store state for unlocked concentration
      ComponentStore.getState = () => ({
        lockedComponents: [],
      });

      const expectedResult = component.amount_mol / totalVolume;

      component.handleTotalVolumeChanges(totalVolume);
      expect(component.molarity_value).toEqual(expectedResult); // Concentration should be recalculated
    });

    it('should handle total volume changes when conc. is locked: recalculate amount and volume', () => {
      const totalVolume = 10; // L
      const originalMolarityValue = component.molarity_value;
      component.density = 1.5;

      // Mock store state for locked concentration
      ComponentStore.getState = () => ({
        lockedComponents: [component.id],
      });

      component.handleTotalVolumeChanges(totalVolume);

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
    it('should set density and recompute volume for liquids without changing amount_mol', () => {
      const density = { unit: 'g/ml', value: 2.0 };
      component.material_group = 'liquid';
      component.amount_mol = 0.5;
      component.purity = 1.0;

      component.handleDensityChange(density, false);

      expect(component.density).toEqual(2.0);
      expect(component.starting_molarity_value).toBe(0);
      expect(component.amount_mol).toBe(0.5);

      // amount_l is derived from existing amount_mol and new density
      const expectedAmountL = (component.amount_mol * component.molecule.molecular_weight)
        / (component.density * 1000 * component.purity);
      expect(component.amount_l).toBeCloseTo(expectedAmountL, 6);
    });

    it('should calculate amount from volume when volume is entered first, then density', () => {
      const density = { unit: 'g/ml', value: 1.2 };
      component.material_group = 'liquid';
      component.amount_l = 0.1; // Volume entered first
      component.amount_mol = 0.0; // Amount is not set yet
      component.purity = 0.9;
      component.molecule.molecular_weight = 18.015;

      component.handleDensityChange(density, false);

      expect(component.density).toBe(1.2);
      expect(component.starting_molarity_value).toBe(0);

      // amount_mol should be calculated from volume and density
      // amount_g = amount_l * density * 1000
      // amount_mol = (amount_g * purity) / molecular_weight
      const expectedAmountG = 0.1 * 1.2 * 1000;
      const expectedAmountMol = (expectedAmountG * 0.9) / 18.015;
      expect(component.amount_mol).toBeCloseTo(expectedAmountMol, 6);

      // amount_l should remain unchanged
      expect(component.amount_l).toBe(0.1);
    });

    it('should prioritize volume over amount_mol when both are set and volume is entered first', () => {
      const density = { unit: 'g/ml', value: 0.8 };
      component.material_group = 'liquid';
      component.amount_l = 0.15; // Volume entered first
      component.amount_mol = 0.3; // Amount was set, but volume takes priority
      component.purity = 1.0;
      component.molecule.molecular_weight = 100.0;

      component.handleDensityChange(density, false);

      expect(component.density).toBe(0.8);

      // amount_mol should be recalculated from volume and density
      const expectedAmountG = 0.15 * 0.8 * 1000;
      const expectedAmountMol = (expectedAmountG * 1.0) / 100.0;
      expect(component.amount_mol).toBeCloseTo(expectedAmountMol, 6);

      // amount_l should remain unchanged
      expect(component.amount_l).toBe(0.15);
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

  describe('handleStartingConcChange', () => {
    it('should set starting concentration and recompute volume for liquids without changing amount_mol', () => {
      const startingConc = { unit: 'mol/l', value: 2.0 };
      component.material_group = 'liquid';
      component.amount_mol = 1.0;
      component.amount_l = 0.0;

      component.handleStartingConcChange(startingConc);

      expect(component.starting_molarity_value).toBe(2.0);
      expect(component.starting_molarity_unit).toBe('mol/l');
      expect(component.density).toBe(0);

      // amount_mol should remain unchanged
      expect(component.amount_mol).toBe(1.0);

      // amount_l is derived from existing amount_mol and new starting concentration
      const expectedAmountL = component.amount_mol / component.starting_molarity_value;
      expect(component.amount_l).toBeCloseTo(expectedAmountL, 6);
    });

    it('should calculate amount from volume when volume is entered first, then starting concentration', () => {
      const startingConc = { unit: 'mol/l', value: 2.0 };
      component.material_group = 'liquid';
      component.amount_l = 0.1; // Volume entered first
      component.amount_mol = 0.0; // Amount not set yet
      component.purity = 0.95;

      component.handleStartingConcChange(startingConc);

      expect(component.starting_molarity_value).toBe(2.0);
      expect(component.starting_molarity_unit).toBe('mol/l');
      expect(component.density).toBe(0);

      // amount_mol should be calculated from volume and concentration
      // amount_mol = starting_molarity_value * amount_l * purity
      const expectedAmountMol = 2.0 * 0.1 * 0.95;
      expect(component.amount_mol).toBeCloseTo(expectedAmountMol, 6);

      // amount_l should remain unchanged
      expect(component.amount_l).toBe(0.1);
    });

    it('should prioritize volume over amount_mol when both are set and volume is entered first', () => {
      const startingConc = { unit: 'mol/l', value: 1.5 };
      component.material_group = 'liquid';
      component.amount_l = 0.2; // Volume entered first
      component.amount_mol = 0.5; // Amount was set, but volume takes priority
      component.purity = 1.0;

      component.handleStartingConcChange(startingConc);

      expect(component.starting_molarity_value).toBe(1.5);

      // amount_mol should be recalculated from volume and concentration
      const expectedAmountMol = 1.5 * 0.2 * 1.0;
      expect(component.amount_mol).toBeCloseTo(expectedAmountMol, 6);

      // amount_l should remain unchanged
      expect(component.amount_l).toBe(0.2);
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
          metrics: 'mmmm', // Default metrics string for unit preservation
          relative_molecular_weight: undefined, // Not set in this case
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
      const createdComponent = Component.createFromSampleData(
        mockComponentData,
        mockParentId,
        mockMaterialGroup,
        mockSample
      );

      expect(createdComponent).toBeInstanceOf(Component);
      expect(createdComponent.parent_id).toBe(mockParentId);
      expect(createdComponent.material_group).toBe(mockMaterialGroup);
      expect(createdComponent.starting_molarity_value)
        .toBe(mockComponentData.component_properties.molarity_value);
      expect(createdComponent.molarity_value).toBe(0);
      expect(createdComponent.reference).toBe(false);
      expect(createdComponent.id).toMatch(/^comp_/);
      expect(createdComponent.amount_g).toBe(mockComponentData.component_properties.amount_g);
      expect(createdComponent.amount_l).toBe(mockComponentData.component_properties.amount_l);

      // Update molecule comparison to check individual properties instead of full object
      expect(createdComponent.molecule.id)
        .toBe(mockComponentData.component_properties.molecule.id);
      expect(createdComponent.molecule.iupac_name)
        .toBe(mockComponentData.component_properties.molecule.iupac_name);
      expect(createdComponent.molecule.molecular_weight)
        .toBe(mockComponentData.component_properties.molecule.molecular_weight);
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
      const createdComponent = Component.createFromSampleData(
        mockComponentData,
        mockParentId,
        mockMaterialGroup,
        mockSample
      );

      // Update molecule comparison to check individual properties instead of full object
      expect(createdComponent.molecule.id)
        .toBe(mockComponentData.component_properties.molecule.id);
      expect(createdComponent.molecule.iupac_name)
        .toBe(mockComponentData.component_properties.molecule.iupac_name);
      expect(createdComponent.molecule.molecular_weight)
        .toBe(mockComponentData.component_properties.molecule.molecular_weight);
    });
  });

  describe('calculateRelativeMolecularWeight', () => {
    it('returns null when sample is not a mixture', () => {
      const sample = {
        isMixture: () => false,
        total_mixture_mass_g: 100
      };

      component.amount_mol = 2;
      const result = component.calculateRelativeMolecularWeight(sample);

      expect(result).toBe(null);
      expect(component.component_properties && component.component_properties.relative_molecular_weight)
        .toBe(undefined);
    });

    it('calculates and assigns relative molecular weight for mixtures', () => {
      const sample = {
        isMixture: () => true,
        total_mixture_mass_g: 36 // grams
      };

      component.id = 'c1';
      component.name = 'Water';
      component.amount_mol = 2; // mol

      const result = component.calculateRelativeMolecularWeight(sample);

      expect(result).toEqual({
        id: 'c1',
        name: 'Water',
        amount_mol: 2,
        relative_molecular_weight: 18
      });

      expect(component.component_properties).toBeTruthy();
      expect(component.component_properties.relative_molecular_weight).toBe(18);
    });

    it('sets relative molecular weight to 0 when inputs are zero or missing', () => {
      const sample = {
        isMixture: () => true,
        total_mixture_mass_g: 0
      };

      component.amount_mol = 0;
      const result = component.calculateRelativeMolecularWeight(sample);

      expect(result).toEqual({
        id: component.id,
        name: 'Unknown',
        amount_mol: 0,
        relative_molecular_weight: 0
      });
      expect(component.component_properties.relative_molecular_weight).toBe(0);
    });
  });

  describe('deserializeData', () => {
    it('should deserialize component data correctly', () => {
      const mockComponentData = {
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
          parent_id: 'parent_123',
          material_group: 'solid',
          reference: true,
          purity: 0.95,
          molecule: {
            id: 'mol_123',
            iupac_name: 'Test Molecule',
            molecular_weight: 100
          }
        }
      };

      const component = Component.deserializeData(mockComponentData);

      expect(component).toBeInstanceOf(Component);
      expect(component.id).toBe('comp_123');
      expect(component.name).toBe('Test Component');
      expect(component.amount_mol).toBe(0.1);
      expect(component.amount_l).toBe(0.05);
      expect(component.amount_g).toBe(2.5);
      expect(component.density).toBe(1.2);
      expect(component.molarity_unit).toBe('M');
      expect(component.molarity_value).toBe(2.0);
      expect(component.starting_molarity_value).toBe(2.0);
      expect(component.starting_molarity_unit).toBe('M');
      expect(component.equivalent).toBe(1.0);
      expect(component.parent_id).toBe('parent_123');
      expect(component.material_group).toBe('solid');
      expect(component.reference).toBe(true);
      expect(component.purity).toBe(0.95);
      expect(component.molecule.id).toBe('mol_123');
      expect(component.molecule.iupac_name).toBe('Test Molecule');
      expect(component.molecule.molecular_weight).toBe(100);
    });

    it('should handle component data without component_properties', () => {
      const mockComponentData = {
        id: 'comp_123',
        name: 'Test Component',
        amount_mol: 0.1
      };

      const component = Component.deserializeData(mockComponentData);

      expect(component).toBeInstanceOf(Component);
      expect(component.id).toBe('comp_123');
      expect(component.name).toBe('Test Component');
      expect(component.amount_mol).toBe(0.1);
    });

    it('should handle component data without molecule in component_properties', () => {
      const mockComponentData = {
        id: 'comp_123',
        component_properties: {
          amount_mol: 0.1,
          molecule_id: 'mol_123'
        }
      };

      const component = Component.deserializeData(mockComponentData);

      expect(component).toBeInstanceOf(Component);
      expect(component.amount_mol).toBe(0.1);
      expect(component.molecule).toBeUndefined();
    });
  });

  describe('svgPath getter', () => {
    it('should return correct SVG path when molecule has svg file', () => {
      component.molecule = {
        molecule_svg_file: 'test_molecule.svg'
      };

      expect(component.svgPath).toBe('/images/molecules/test_molecule.svg');
    });

    it('should return empty string when molecule has no svg file', () => {
      component.molecule = {
        id: 101
      };

      expect(component.svgPath).toBe('');
    });

    it('should return empty string when molecule is null', () => {
      component.molecule = null;

      expect(component.svgPath).toBe('');
    });
  });

  describe('calculateAmountFromDensity', () => {
    it('should calculate amount from density correctly', () => {
      component.density = 1.5;
      component.amount_l = 0.1;
      component.purity = 0.9;
      component.molecule.molecular_weight = 18.015;

      component.calculateAmountFromDensity(component.purity);

      const expectedAmountMol = (1.5 * 0.1 * 1000 * 0.9) / 18.015;
      expect(component.amount_mol).toBeCloseTo(expectedAmountMol, 6);
      expect(component.starting_molarity_value).toBe(0);
    });
  });

  describe('calculateAmountFromConcentration', () => {
    it('should calculate amount from concentration correctly', () => {
      component.starting_molarity_value = 2.0;
      component.amount_l = 0.1;
      component.purity = 0.95;

      component.calculateAmountFromConcentration(component.purity);

      const expectedAmountMol = 2.0 * 0.1 * 0.95;
      expect(component.amount_mol).toBeCloseTo(expectedAmountMol, 6);
    });
  });

  describe('calculateVolumeFromDensity', () => {
    it('should calculate volume from density correctly', () => {
      component.amount_mol = 0.1;
      component.density = 1.2;
      component.purity = 0.9;
      component.molecule.molecular_weight = 18.015;

      component.calculateVolumeFromDensity(component.purity);

      const expectedAmountL = (0.1 * 18.015) / (1.2 * 1000 * 0.9);
      expect(component.amount_l).toBeCloseTo(expectedAmountL, 6);
      expect(component.starting_molarity_value).toBe(0);
    });
  });

  describe('calculateVolumeFromConcentration', () => {
    it('should calculate volume from concentration correctly', () => {
      component.amount_mol = 0.2;
      component.starting_molarity_value = 2.0;

      component.calculateVolumeFromConcentration();

      const expectedAmountL = 0.2 / 2.0;
      expect(component.amount_l).toBeCloseTo(expectedAmountL, 6);
      expect(component.density).toBe(0);
    });
  });

  describe('updateRatio', () => {
    it('should update ratio and recalculate amounts for liquid component', () => {
      component.material_group = 'liquid';
      component.equivalent = 1.0;
      component.density = 1.5;
      component.purity = 0.9;
      const totalVolume = 10;
      const referenceMoles = 0.5;

      component.updateRatio(2.0, 'liquid', totalVolume, referenceMoles);

      expect(component.equivalent).toBe(2.0);
      expect(component.amount_mol).toBeCloseTo(1.0, 6); // 2.0 * 0.5
    });

    it('should update ratio and recalculate amounts for solid component', () => {
      component.material_group = 'solid';
      component.equivalent = 1.0;
      component.purity = 0.9;
      const totalVolume = 10;
      const referenceMoles = 0.5;

      component.updateRatio(2.0, 'solid', totalVolume, referenceMoles);

      expect(component.equivalent).toBe(2.0);
      expect(component.amount_mol).toBeCloseTo(1.0, 6); // 2.0 * 0.5
    });

    it('should not update if ratio is the same', () => {
      component.equivalent = 2.0;
      const originalAmountMol = component.amount_mol;

      component.updateRatio(2.0, 'liquid', 10, 0.5);

      expect(component.equivalent).toBe(2.0);
      expect(component.amount_mol).toBe(originalAmountMol);
    });
  });

  describe('updateRatioFromReference', () => {
    beforeEach(() => {
      // Mock store state for unlocked concentration
      ComponentStore.getState = () => ({
        lockedComponents: [],
      });
    });

    it('should set ratio to 1 when no reference component', () => {
      component.equivalent = 2.0;

      component.updateRatioFromReference(null);

      expect(component.equivalent).toBe(1);
    });

    it('should set ratio to 1 when this is the reference component', () => {
      const referenceComponent = { id: component.id, amount_mol: 0.5 };
      component.equivalent = 2.0;

      component.updateRatioFromReference(referenceComponent);

      expect(component.equivalent).toBe(1);
    });

    it('should calculate ratio correctly from reference component', () => {
      const referenceComponent = { id: 'ref_123', amount_mol: 0.5 };
      component.id = 'comp_123';
      component.amount_mol = 1.0;

      component.updateRatioFromReference(referenceComponent);

      expect(component.equivalent).toBeCloseTo(2.0, 6); // 1.0 / 0.5
    });

    it('should set ratio to 0 when reference amount is invalid', () => {
      const referenceComponent = { id: 'ref_123', amount_mol: 0 };
      component.id = 'comp_123';
      component.amount_mol = 1.0;

      component.updateRatioFromReference(referenceComponent);

      expect(component.equivalent).toBe(0);
    });

    it('should set ratio to 0 when current amount is invalid', () => {
      const referenceComponent = { id: 'ref_123', amount_mol: 0.5 };
      component.id = 'comp_123';
      component.amount_mol = NaN;

      component.updateRatioFromReference(referenceComponent);

      expect(component.equivalent).toBe(0);
    });
  });

  describe('calculateMassFromTargetConc', () => {
    it('should calculate mass from target concentration correctly', () => {
      component.amount_mol = 0.1;
      component.molecule.molecular_weight = 18.015;
      component.purity = 0.9;

      component.calculateMassFromTargetConc(component.purity);

      const expectedMass = (0.1 * 18.015) / 0.9;
      expect(component.amount_g).toBeCloseTo(expectedMass, 6);
    });
  });

  describe('calculateMassFromAmount', () => {
    it('should update purity when lockAmountColumnSolids is true', () => {
      component.amount_mol = 0.1;
      component.amount_g = 2.0;
      component.molecule.molecular_weight = 18.015;
      component.parent_id = 'sample_123';

      // Mock store state with proper structure
      ComponentStore.getState = () => ({
        lockAmountColumnSolidsBySample: {
          sample_123: true,
        },
      });

      component.calculateMassFromAmount(component.purity);

      const expectedPurity = (0.1 * 18.015) / 2.0;
      expect(component.purity).toBeCloseTo(expectedPurity, 6);
    });

    it('should calculate mass when lockAmountColumnSolids is false', () => {
      component.amount_mol = 0.1;
      component.molecule.molecular_weight = 18.015;
      component.purity = 0.9;

      // Mock store state
      ComponentStore.getState = () => ({
        lockAmountColumnSolids: false,
      });

      component.calculateMassFromAmount(component.purity);

      const expectedMass = (0.1 * 18.015) / 0.9;
      expect(component.amount_g).toBeCloseTo(expectedMass, 6);
    });
  });

  describe('updatePurityFromAmount', () => {
    it('should update purity correctly when calculated purity is <= 1', () => {
      component.amount_mol = 0.1;
      component.amount_g = 2.0;
      component.molecule.molecular_weight = 18.015;

      component.updatePurityFromAmount();

      const expectedPurity = (0.1 * 18.015) / 2.0;
      expect(component.purity).toBeCloseTo(expectedPurity, 6);
    });

    it('should not update purity when calculated purity is > 1', () => {
      const originalPurity = component.purity;
      component.amount_mol = 0.1;
      component.amount_g = 1.0; // Very small mass
      component.molecule.molecular_weight = 18.015;

      component.updatePurityFromAmount();

      expect(component.purity).toBe(originalPurity);
    });
  });

  describe('calculateRelativeMolecularWeight', () => {
    it('should return null when sample is not a mixture', () => {
      const mockSample = { isMixture: () => false };

      const result = component.calculateRelativeMolecularWeight(mockSample);

      expect(result).toBeNull();
    });

    it('should return null when component is null', () => {
      const mockSample = { isMixture: () => true };

      const result = component.calculateRelativeMolecularWeight.call(null, mockSample);

      expect(result).toBeNull();
    });

    it('should calculate relative molecular weight correctly', () => {
      const mockSample = {
        isMixture: () => true,
        total_mixture_mass_g: 100
      };
      component.amount_mol = 0.5;

      const result = component.calculateRelativeMolecularWeight(mockSample);

      const expected = 100 / 0.5; // total_mixture_mass_g / amount_mol
      expect(result.relative_molecular_weight).toBeCloseTo(expected, 6);
    });
  });

  describe('concentrationCheckWarning', () => {
    let mockAdd;
    let originalNotificationActions;

    beforeEach(() => {
      // Mock NotificationActions
      mockAdd = sinon.spy();
      originalNotificationActions = require('src/stores/alt/actions/NotificationActions');
      require('src/stores/alt/actions/NotificationActions').add = mockAdd;
    });

    afterEach(() => {
      // Restore original NotificationActions
      if (originalNotificationActions) {
        require('src/stores/alt/actions/NotificationActions').add = originalNotificationActions.add;
      }
    });

    it('should not show warning when concentration is lower than starting concentration', (done) => {
      component.concn = 0.5;
      component.starting_molarity_value = 1.0;

      component.concentrationCheckWarning();

      setTimeout(() => {
        expect(mockAdd.called).toBe(false);
        done();
      }, 600); // Wait longer than the 500ms timeout
    });

    it('should clear previous timeout when called multiple times', () => {
      component.concn = 2.0;
      component.starting_molarity_value = 1.0;

      component.concentrationCheckWarning();
      component.concentrationCheckWarning();

      expect(component._concentrationWarningTimeout).toBeDefined();
    });
  });

  describe('isComponentConcentrationLocked', () => {
    it('should return true when component is in locked components list', () => {
      component.id = 'comp_123';
      ComponentStore.getState = () => ({
        lockedComponents: ['comp_123', 'comp_456']
      });

      const result = component.isComponentConcentrationLocked();

      expect(result).toBe(true);
    });

    it('should return false when component is not in locked components list', () => {
      component.id = 'comp_123';
      ComponentStore.getState = () => ({
        lockedComponents: ['comp_456', 'comp_789']
      });

      const result = component.isComponentConcentrationLocked();

      expect(result).toBe(false);
    });

    it('should return false when store state is unavailable', () => {
      component.id = 'comp_123';
      ComponentStore.getState = () => null;

      const result = component.isComponentConcentrationLocked();

      expect(result).toBe(false);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle NaN values in handleVolumeChange', () => {
      const amount = { value: NaN, unit: 'ml' };
      const totalVolume = 2;

      const originalAmountL = component.amount_l;
      const originalAmountMol = component.amount_mol;

      component.handleVolumeChange(amount, totalVolume);

      expect(component.amount_l).toBe(originalAmountL);
      expect(component.amount_mol).toBe(originalAmountMol);
    });

    it('should handle invalid unit in handleVolumeChange', () => {
      const amount = { value: 10, unit: null };
      const totalVolume = 2;

      const originalAmountL = component.amount_l;
      const originalAmountMol = component.amount_mol;

      component.handleVolumeChange(amount, totalVolume);

      expect(component.amount_l).toBe(originalAmountL);
      expect(component.amount_mol).toBe(originalAmountMol);
    });

    it('should handle NaN values in handleAmountChange', () => {
      const amount = { value: NaN, unit: 'mol' };
      const totalVolume = 2;

      const originalAmountMol = component.amount_mol;

      component.handleAmountChange(amount, totalVolume);

      expect(component.amount_mol).toBe(originalAmountMol);
    });

    it('should handle invalid unit in handleAmountChange', () => {
      const amount = { value: 10, unit: 'g' };
      const totalVolume = 2;

      const originalAmountMol = component.amount_mol;

      component.handleAmountChange(amount, totalVolume);

      expect(component.amount_mol).toBe(originalAmountMol);
    });

    it('should handle locked column in handleConcentrationChange', () => {
      const amount = { value: 1, unit: 'mol/l' };
      const totalVolume = 10;
      const lockColumn = true;

      const originalMolarityValue = component.molarity_value;

      component.handleConcentrationChange(amount, totalVolume, 'targetConc', lockColumn);

      expect(component.molarity_value).toBe(originalMolarityValue);
    });

    it('should handle locked column in handleDensityChange', () => {
      const amount = { value: 1.5, unit: 'g/ml' };
      const lockColumn = true;

      const originalDensity = component.density;

      component.handleDensityChange(amount, lockColumn);

      expect(component.density).toBe(originalDensity);
    });

    it('should handle zero total volume in calculateTargetConcentration', () => {
      component.amount_mol = 0.1;
      const totalVolume = 0;

      component.calculateTargetConcentration(totalVolume);

      expect(component.molarity_value).toBe(null);
    });

    it('should handle negative total volume in calculateTargetConcentration', () => {
      component.amount_mol = 0.1;
      const totalVolume = -5;

      component.calculateTargetConcentration(totalVolume);

      expect(component.molarity_value).toBe(null);
    });
  });
});
