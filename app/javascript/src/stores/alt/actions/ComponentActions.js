import alt from 'src/stores/alt/alt';

/**
 * ComponentActions provides actions for toggling lock states on components and columns.
 */
class ComponentActions {
  /**
   * Toggles the lock state for a column based on the action type.
   * @param {boolean} lockState - The new lock state (true/false).
   * @param {string} actionType - The type of action (e.g., 'amount', 'amountSolids').
   * @returns {Object} An object with the key to lock and its new value.
   */
  toggleLockState(lockState, actionType) {
    const lockKeyMapping = {
      amount: 'lockAmountColumn',
      amountSolids: 'lockAmountColumnSolids',
    };

    const key = lockKeyMapping[actionType];

    return {
      key,
      value: lockState,
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
}

export default alt.createActions(ComponentActions);
