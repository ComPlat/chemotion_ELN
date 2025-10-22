/* eslint-disable class-methods-use-this */
import alt from 'src/stores/alt/alt';

/**
 * Alt.js Actions for managing weight percentage-based reaction calculations.
 *
 * These actions update the WeightPercentageReactionStore to coordinate weight percentage
 * calculations across the reaction scheme UI. Used primarily in reaction types where
 * amounts are calculated based on weight percentage rather than molar equivalents.
 *
 * Workflow:
 * 1. User enables weight percentage mode on a reaction
 * 2. User selects a material as the weight percentage reference
 * 3. setWeightPercentageReference() stores this reference material
 * 4. setTargetAmountWeightPercentageReference() stores the target amount
 * 5. Other starting materials calculate their amounts as: amount = targetAmount * weight_percentage
 *
 * Store state managed:
 * - weightPercentageReference: The material selected as the weight percentage reference
 * - targetAmount: The target amount used for weight percentage calculations
 */
class WeightPercentageReactionActions {
  /**
   * Sets the weight percentage reference material.
   *
   * This action is dispatched when a user selects a product material as the reference
   * for weight percentage calculations in the reaction scheme.
   *
   * @param {Object} value - The material object to set as the weight percentage reference
   * @returns {Object} The material object (passed to the store)
   */
  setWeightPercentageReference(value) {
    return value;
  }

  /**
   * Sets the target amount for weight percentage calculations.
   *
   * This action is dispatched when the target amount changes, which affects how
   * starting material amounts are calculated: amount = targetAmount.value * weight_percentage
   *
   * @param {Object} value - The target amount object (with value and unit properties)
   * @returns {Object} The target amount object (passed to the store)
   */
  setTargetAmountWeightPercentageReference(value) {
    return value;
  }
}

export default alt.createActions(WeightPercentageReactionActions);
