import alt from 'src/stores/alt/alt';

/**
 * ComponentActions provides actions for toggling lock states on components and columns.
 */
class ComponentActions {
  /**
   * Toggles the lock state for a column based on the action type, per sample.
   * @param {boolean} lockState - The new lock state (true/false).
   * @param {string} actionType - The type of action (e.g., 'amount', 'amountSolids').
   * @param {string|number} sampleId - The ID of the sample to update.
   * @returns {Object} An object with the key to lock, its new value, and sampleId.
   */
  toggleLockState(lockState, actionType, sampleId) {
    const lockKeyMapping = {
      amount: 'lockAmountColumn',
      amountSolids: 'lockAmountColumnSolids',
    };

    const key = lockKeyMapping[actionType];

    return {
      key,
      value: lockState,
      sampleId,
    };
  }

  /**
   * Toggles the concentration lock for a specific component by its ID.
   * @param {string|number} componentId - The ID of the component to toggle.
   * @param {boolean} lockConc - The current lock state for concentration.
   * @returns {Object} An object with the component ID and the toggled lock state.
   */
  toggleComponentLock(componentId, lockConc) {
    return {
      componentId,
      lockConc: !lockConc,
    };
  }

  /**
   * Toggles the lock state for the reaction equivalent column.
   * @param {boolean} lockState - The new lock state (true/false).
   * @param {string|number} reactionId - The ID of the reaction to update.
   * @returns {Object} An object with the lock state and reactionId.
   */
  toggleReactionEquivLock(lockState, reactionId) {
    return {
      lockState,
      reactionId,
    };
  }
}

export default alt.createActions(ComponentActions);
