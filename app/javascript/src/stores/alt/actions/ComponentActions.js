import alt from 'src/stores/alt/alt';

class ComponentActions {
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

  // Lock/unlock a specific component by its ID
  toggleComponentLock(componentId, lockConc) {
    return {
      componentId,
      lockConc: !lockConc,
    };
  }
}

export default alt.createActions(ComponentActions);
