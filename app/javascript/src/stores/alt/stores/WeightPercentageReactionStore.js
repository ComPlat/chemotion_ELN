import alt from 'src/stores/alt/alt';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';

/**
 * Alt.js Store for managing weight percentage-based reaction calculation state.
 *
 * This store maintains the global state for weight percentage mode in reactions,
 * enabling reactions to calculate material amounts based on
 * weight percentage rather than molar equivalents.
 *
 * State shape:
 * {
 *   weightPercentageReference: Object|null - The product material selected as reference
 *   targetAmount: Object|null - The target amount for calculations (value + unit)
 * }
 *
 * Calculation workflow:
 * 1. User enables weight percentage mode on a reaction
 * 2. User selects a material as the weight percentage reference
 * 3. Store receives reference material via setWeightPercentageReference()
 * 4. Store receives target amount via setTargetAmountWeightPercentageReference()
 * 5. Starting materials calculate amounts as: amount = targetAmount.value * weight_percentage
 *
 * Store listeners:
 * - ReactionDetailsScheme subscribes to this store to update material calculations
 * - Material components read from this store to enable/disable weight percentage fields
 *
 * Related components:
 * - ReactionDetailsScheme: Triggers updateReactionMaterials() on store changes
 * - Material: Reads store to determine if weight percentage field should be enabled
 * - Sample: Uses calculateWeightPercentageBasedOnAmount() with values from this store
 */
class WeightPercentageReactionStore {
  constructor() {
    this.state = {
      weightPercentageReference: null,
      targetAmount: null,
    };

    this.bindListeners({
      setWeightPercentageReference: this.setWeightPercentageReference,
      setTargetAmountWeightPercentageReference: this.setTargetAmountWeightPercentageReference,
    });
    this.bindActions(WeightPercentageReactionActions);
  }

  /**
   * Updates the weight percentage reference material in the store.
   *
   * This method is called when a user selects a material as the reference
   * for weight percentage calculations. The reference material is used as
   * the basis for calculating amounts for materials who have a defined weight percentage value.
   *
   * @param {Object} value - The material object to set as the weight percentage reference
   */
  setWeightPercentageReference(value) {
    this.setState({
      weightPercentageReference: value,
    });
  }

  /**
   * Updates the target amount for weight percentage calculations.
   *
   * This method is called when the target amount changes. Material's amounts
   * are calculated as: amount = targetAmount.value * material.weight_percentage
   *
   * @param {Object} value - The target amount object (should have value and unit properties)
   */
  setTargetAmountWeightPercentageReference(value) {
    this.setState({
      targetAmount: value,
    });
  }
}

export default alt.createStore(WeightPercentageReactionStore, 'WeightPercentageReactionStore');
