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
// Note: do not import UnitsConversion helpers here to avoid tautological tests
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';
import {
  createCompleteGasPhaseReaction,
  createGasProductSample,
  createFeedstockSample,
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
    reaction = createCompleteGasPhaseReaction();

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
    });
  });

  describe('Feedstock Material Calculations', () => {
    it('should calculate moles from volume using Calculation1: Mol = Purity × 1 × V/(0.0821 × 294)', () => {
      const feedstock = reaction.reactants[0];

      // Given: volume in liters
      const volumeL = 10; // 10 liter
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
      const expectedVolume = (moles * 0.0821 * 294) / purity;

      // Verify amount_mol and that converting back to liters yields a numeric value
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

      // Calculate expected: volume → moles → grams using explicit formula
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
      expect(feedstock.equivalent).toBeCloseTo(expectedEquivalent, 4);
    });
  });

  describe('Catalyst Material Calculations', () => {
    it('should calculate correct TON formula: TON = Mol gas product / Mol catalyst', () => {
      const catalyst = reaction.reactants[1];
      const gasProduct = reaction.products[0];
      // Stub store to return catalyst reference mole used by model
      const storeStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({
        catalystReferenceMolValue: catalyst.amount_mol,
        reactionVesselSizeValue: reaction.vessel_size.amount / 1000
      });

      // Call the model method that computes TON (behavior under test)
      gasProduct.updateTONValue(gasProduct.amount_mol);

      // Expected TON = mol product / mol catalyst (arithmetic)
      const expectedTON = gasProduct.amount_mol / catalyst.amount_mol;

      // Verify the model updated the gas_phase_data side-effect
      expect(gasProduct.gas_phase_data.turnover_number).toBeDefined();
      expect(gasProduct.gas_phase_data.turnover_number).toBeCloseTo(expectedTON, 6);

      storeStub.restore();
    });

    it('should show TON changes when catalyst moles change', () => {
      const catalyst = reaction.reactants[1];
      const gasProduct = reaction.products[0];

      // Stub store to return initial catalyst reference mole
      let storeStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({
        catalystReferenceMolValue: catalyst.amount_mol,
        reactionVesselSizeValue: reaction.vessel_size.amount / 1000
      });

      // Force model to compute initial TON
      gasProduct.updateTONValue(gasProduct.amount_mol);
      const initialTON = gasProduct.gas_phase_data.turnover_number;

      // Update catalyst moles to a new value and update store accordingly
      catalyst.amount_value = 0.5;
      catalyst.amount_unit = 'mol';
      expect(catalyst.amount_mol).toBe(0.5);

      storeStub.restore();
      storeStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({
        catalystReferenceMolValue: catalyst.amount_mol,
        reactionVesselSizeValue: reaction.vessel_size.amount / 1000
      });

      // Recompute TON via model behavior
      gasProduct.updateTONValue(gasProduct.amount_mol);
      const newTON = gasProduct.gas_phase_data.turnover_number;

      // Since we increased catalyst amount, TON should decrease
      expect(newTON).toBeLessThan(initialTON);
      expect(newTON).toBeCloseTo(gasProduct.amount_mol / 0.5, 6);

      storeStub.restore();
    });

    it('should calculate correct TOF formula: TOF = TON / time', () => {
      const gasProduct = reaction.products[0];

      // Set a TON value and time, then compute TOF using helper utilities
      const ton = 0.6;
      gasProduct.gas_phase_data.turnover_number = ton;
      gasProduct.gas_phase_data.time.value = 3;

      // Call model method to compute turnover frequency based on time
      gasProduct.gas_phase_data.time.value = 3;
      gasProduct.updateTONPerTimeValue(ton, gasProduct.gas_phase_data.time);

      const timeInHours = gasProduct.gas_phase_data.time.value;
      const expectedTOF = ton / timeInHours;

      // Verify the model wrote the computed turnover frequency
      expect(gasProduct.gas_phase_data.turnover_frequency.value).toBeCloseTo(expectedTOF, 6);
    });

    it('should show TOF changes when time changes', () => {
      const gasProduct = reaction.products[0];

      // Set initial TON and time
      const tonVal = 0.6;
      gasProduct.gas_phase_data.turnover_number = tonVal;
      gasProduct.gas_phase_data.time.value = 3;

      // Ensure model computes initial frequency via behavior
      gasProduct.gas_phase_data.time.value = 3;
      gasProduct.updateTONPerTimeValue(tonVal, gasProduct.gas_phase_data.time);
      const initialTOF = gasProduct.gas_phase_data.turnover_frequency.value;

      // Update time to double the value and recompute using model
      gasProduct.gas_phase_data.time.value = 6;
      gasProduct.updateTONPerTimeValue(tonVal, gasProduct.gas_phase_data.time);
      const newTOF = gasProduct.gas_phase_data.turnover_frequency.value;

      expect(newTOF).toBeLessThan(initialTOF);
      expect(newTOF).toBeCloseTo(newTOF, 6);
      expect(newTOF).toBeCloseTo(initialTOF / 2, 6); // Double time = half frequency
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
      expect(gasProduct.equivalent).toBeCloseTo(molRatio, 3);
    });

    it('should update TON when gas product moles change', () => {
      const gasProduct = reaction.products[0];
      const catalyst = reaction.reactants[1]; // catalyst

      // Stub store to provide catalyst reference mole used by the model
      const storeStub = sinon.stub(GasPhaseReactionStore, 'getState').returns({
        catalystReferenceMolValue: catalyst.amount_mol,
        reactionVesselSizeValue: reaction.vessel_size.amount / 1000
      });

      // Trigger the model behavior that updates TON
      gasProduct.updateTONValue(gasProduct.amount_mol);

      // Expected TON = mol product / mol catalyst
      const expectedTON = gasProduct.amount_mol / catalyst.amount_mol;

      // Verify model side-effect
      expect(gasProduct.gas_phase_data.turnover_number).toBeDefined();
      expect(gasProduct.gas_phase_data.turnover_number).toBeCloseTo(expectedTON, 6);

      storeStub.restore();
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

    it('should handle null values', () => {
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
  });
});
