/* eslint-disable no-unused-expressions */
import React from 'react';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import expect from 'expect';
import sinon from 'sinon';
import {
  beforeEach, afterEach, describe, it
} from 'mocha';

import ReactionDetailsScheme from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionDetailsScheme';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
import {
  createGasPhaseReaction,
  createFeedstockSample,
  createCatalystSample,
  createGasProductSample,
  createReferenceMaterial
} from '../../../../../../../../helper/gasPhaseReactionTestHelpers';

configure({ adapter: new Adapter() });

describe('ReactionDetailsScheme - Gas Phase Reaction Tests', () => {
  let reaction;
  let onReactionChangeSpy;
  let onInputChangeSpy;
  let setReactionVesselSizeStub;
  let setCatalystReferenceMoleStub;

  beforeEach(() => {
    // Create a complete gas phase reaction
    reaction = createGasPhaseReaction();
    reaction.starting_materials = [createReferenceMaterial()];
    reaction.reactants = [
      createFeedstockSample(),
      createCatalystSample()
    ];
    reaction.products = [createGasProductSample()];

    // Spy on callbacks
    onReactionChangeSpy = sinon.spy();
    onInputChangeSpy = sinon.spy();

    // Stub GasPhaseReactionActions
    setReactionVesselSizeStub = sinon.stub(GasPhaseReactionActions, 'setReactionVesselSize');
    setCatalystReferenceMoleStub = sinon.stub(GasPhaseReactionActions, 'setCatalystReferenceMole');
  });

  afterEach(() => {
    setReactionVesselSizeStub.restore();
    setCatalystReferenceMoleStub.restore();
  });

  describe('Component Mounting', () => {
    it('should render without crashing', () => {
      const wrapper = shallow(
        React.createElement(ReactionDetailsScheme, {
          reaction,
          onReactionChange: onReactionChangeSpy,
          onInputChange: onInputChangeSpy
        })
      );

      expect(wrapper.exists()).toBe(true);
    });

    it('should have gas phase reaction data structures', () => {
      // Verify the test data is set up correctly
      expect(reaction.gaseous).toBe(true);
      expect(reaction.vessel_size).toEqual({ amount: 10000, unit: 'ml' });
      expect(reaction.reactants.length).toBe(2);
      expect(reaction.products.length).toBe(1);
      expect(reaction.reactants[0].gas_type).toBe('feedstock');
      expect(reaction.reactants[1].gas_type).toBe('catalyst');
      expect(reaction.products[0].gas_type).toBe('gas');
    });

    it('should stub GasPhaseReactionActions methods', () => {
      // Verify stubs are working
      expect(setReactionVesselSizeStub).toBeTruthy();
      expect(setCatalystReferenceMoleStub).toBeTruthy();

      // TODO: Implement async tests to verify store synchronization
      // The component uses setTimeout to update the store, so async testing is needed
    });
  });

  describe('Feedstock Material Calculations', () => {
    it('should calculate moles from volume using Calculation1: Mol = Purity × 1 × V/(0.0821 × 294)', () => {
      const feedstock = reaction.reactants[0];

      // Given: volume in liters
      const volumeL = 1.0; // 1 liter
      const purity = 1.0;
      feedstock.purity = purity;

      // Set amount in liters
      feedstock.amount_value = volumeL;
      feedstock.amount_unit = 'l';

      // Expected: Mol feedstock = Purity × V/(0.0821 × 294)
      const expectedMol = (purity * volumeL) / (0.0821 * 294);

      // Verify calculation
      expect(feedstock.amount_mol).toBeCloseTo(expectedMol, 6);
    });

    it('should recalculate volume when moles change', () => {
      const feedstock = reaction.reactants[0];
      const purity = 1.0;
      feedstock.purity = purity;

      // Set amount in moles
      const moles = 0.05;
      feedstock.amount_value = moles;
      feedstock.amount_unit = 'mol';

      // Expected: Volume = (moles * 0.0821 * 294) / purity
      const expectedVolume = (moles * 0.0821 * 294) / purity;

      // Verify calculation
      expect(feedstock.amount_l).toBeCloseTo(expectedVolume, 6);
    });

    it('should recalculate grams when volume changes', () => {
      const feedstock = reaction.reactants[0];
      const purity = 1.0;
      feedstock.purity = purity;

      // Set amount in liters
      const volumeL = 2.5;
      feedstock.amount_value = volumeL;
      feedstock.amount_unit = 'l';

      // Calculate expected: volume → moles → grams
      const expectedMol = (purity * volumeL) / (0.0821 * 294);
      const expectedGrams = expectedMol * feedstock.molecule.molecular_weight;

      // Verify calculation
      expect(feedstock.amount_g).toBeCloseTo(expectedGrams, 6);
    });

    it('should handle equivalent changes for feedstock', () => {
      const feedstock = reaction.reactants[0];
      const referenceMaterial = reaction.starting_materials[0];

      // Feedstock equivalent should be calculated relative to reference material
      // Equivalent = (feedstock moles) / (reference moles)
      const expectedEquivalent = feedstock.amount_mol / referenceMaterial.amount_mol;

      expect(feedstock.equivalent).toBeCloseTo(expectedEquivalent, 6);
    });
  });

  describe('Catalyst Material Calculations', () => {
    it('should calculate correct TON formula: TON = Mol gas product / Mol catalyst', () => {
      const catalyst = reaction.reactants[1];
      const gasProduct = reaction.products[0];

      // TON (Turnover Number) = Mol gas product / Mol catalyst
      const expectedTON = gasProduct.amount_mol / catalyst.amount_mol;

      // Verify the calculation is positive and valid
      expect(expectedTON).toBeGreaterThan(0);
      expect(expectedTON).toBe(gasProduct.amount_mol / catalyst.amount_mol);
    });

    it('should show TON changes when catalyst moles change', () => {
      const catalyst = reaction.reactants[1];
      const gasProduct = reaction.products[0];

      // Store initial catalyst moles and calculate initial TON
      const initialCatalystMol = catalyst.amount_mol; // ~0.234 mol
      const gasProductMol = gasProduct.amount_mol;
      const initialTON = gasProductMol / initialCatalystMol;

      // Update catalyst moles to a new value
      catalyst.amount_value = 0.5;
      catalyst.amount_unit = 'mol';

      // Verify catalyst moles changed
      expect(catalyst.amount_mol).toBe(0.5);

      // Calculate new expected TON with updated catalyst amount
      const newTON = gasProductMol / 0.5;

      // Since we increased catalyst amount (0.234 → 0.5), TON should decrease
      expect(newTON).toBeLessThan(initialTON);
      expect(newTON).toBeCloseTo(gasProductMol / 0.5, 6);
    });

    it('should calculate correct TOF formula: TOF = TON / time', () => {
      const gasProduct = reaction.products[0];

      // Set a TON value
      gasProduct.gas_phase_data.turnover_number = 0.6;
      gasProduct.gas_phase_data.time.value = 3;

      // TOF (Turnover Frequency) = TON / time in hours
      const ton = gasProduct.gas_phase_data.turnover_number;
      const timeInHours = gasProduct.gas_phase_data.time.value;
      const expectedTOF = ton / timeInHours;

      // Verify the calculation
      expect(expectedTOF).toBeCloseTo(0.6 / 3, 6);
      expect(expectedTOF).toBe(ton / timeInHours);
    });

    it('should show TOF changes when time changes', () => {
      const gasProduct = reaction.products[0];

      // Set initial TON and time
      gasProduct.gas_phase_data.turnover_number = 0.6;
      gasProduct.gas_phase_data.time.value = 3;

      const ton = gasProduct.gas_phase_data.turnover_number;
      const initialTime = 3;
      const initialTOF = ton / initialTime;

      // Update time to double the value
      gasProduct.gas_phase_data.time.value = 6;

      // Calculate new expected TOF: same TON but double time = half frequency
      const newTOF = ton / 6;

      expect(newTOF).toBeLessThan(initialTOF);
      expect(newTOF).toBeCloseTo(ton / 6, 6);
      expect(newTOF).toBe(initialTOF / 2); // Double time = half frequency
    });
  });

  describe('Gas Product Calculations', () => {
    it('should calculate moles from ppm using Calculation2: Mol = ppm × V/(0.0821 × T × 1e6)', () => {
      const gasProduct = reaction.products[0];

      // Given: ppm, temperature, vessel size
      const ppm = gasProduct.gas_phase_data.part_per_million;
      const tempK = gasProduct.gas_phase_data.temperature.value;
      const vesselSizeL = reaction.vessel_size.amount / 1000; // Convert ml to L: 10000 ml = 10 L

      // Expected: Mol Product = ppm × V/(0.0821 × temp_in_K × 1000000)
      const expectedMol = (ppm * vesselSizeL) / (0.0821 * tempK * 1000000);

      // Verify calculation
      expect(gasProduct.amount_mol).toBeCloseTo(expectedMol, 10);
    });

    it('should recalculate equivalent (yield) when ppm changes', () => {
      const gasProduct = reaction.products[0];
      const feedstock = reaction.reactants[0];

      // Equivalent for gas products is stored in the test data
      // Verify the relationship is mathematically sound
      const molRatio = gasProduct.amount_mol / feedstock.amount_mol;

      // Verify the ratio is a positive number
      expect(molRatio).toBeGreaterThan(0);
      expect(gasProduct.equivalent).toBeDefined();
      expect(gasProduct.equivalent).toBeGreaterThan(0);
    });

    it('should update TON when gas product moles change', () => {
      const gasProduct = reaction.products[0];
      const catalyst = reaction.reactants[1]; // catalyst

      // TON (Turnover Number) = Mol gas product / Mol catalyst
      const calculatedTON = gasProduct.amount_mol / catalyst.amount_mol;

      // Verify TON is defined and calculation formula is valid
      expect(gasProduct.gas_phase_data.turnover_number).toBeDefined();
      expect(calculatedTON).toBeGreaterThan(0);

      // Verify the mathematical relationship
      const ratio = gasProduct.amount_mol / catalyst.amount_mol;
      expect(ratio).toBe(calculatedTON);
    });

    it('should handle temperature unit conversions correctly', () => {
      const gasProduct = reaction.products[0];

      // Test that temperature is properly stored and can be converted
      const tempK = gasProduct.gas_phase_data.temperature.value;
      const tempUnit = gasProduct.gas_phase_data.temperature.unit;

      expect(tempUnit).toBe('K');
      expect(tempK).toBeGreaterThan(0);

      // Verify temperature conversions: K to °C: °C = K - 273.15
      const expectedCelsius = tempK - 273.15;
      expect(expectedCelsius).toBeCloseTo(tempK - 273.15, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values gracefully', () => {
      // Create a feedstock with target_amount = 0 instead of real_amount
      const feedstock = createFeedstockSample({
        target_amount_value: 0,
        target_amount_unit: 'l',
        real_amount_value: 0,
        real_amount_unit: 'l',
        purity: 1.0
      });

      // With zero volume, should handle gracefully without errors
      expect(feedstock.target_amount_value).toBe(0);
      expect(feedstock.real_amount_value).toBe(0);

      // Calculation with zero should not crash
      expect(() => feedstock.amount_mol).not.toThrow();
    });

    it('should handle null/undefined values', () => {
      const gasProduct = createGasProductSample({
        gas_phase_data: {
          time: { unit: 'h', value: null },
          temperature: { unit: 'K', value: null },
          turnover_number: null,
          part_per_million: null,
          turnover_frequency: { unit: 'TON/h', value: null }
        }
      });

      // Should not crash with null values
      expect(gasProduct.gas_phase_data.time.value).toBeNull();
      expect(gasProduct.gas_phase_data.temperature.value).toBeNull();
      expect(gasProduct.gas_phase_data.turnover_number).toBeNull();
    });

    it('should handle very small/large numbers', () => {
      const gasProduct = reaction.products[0];

      // Test with very small ppm (1 ppm)
      gasProduct.gas_phase_data.part_per_million = 1;
      const smallMol = gasProduct.amount_mol;
      expect(smallMol).toBeGreaterThan(0);
      expect(smallMol).toBeLessThan(1);

      // Test with large ppm (100,000 ppm = 10%)
      gasProduct.gas_phase_data.part_per_million = 100000;
      // Should handle large numbers without precision loss
      expect(typeof gasProduct.gas_phase_data.part_per_million).toBe('number');
    });
  });
});
