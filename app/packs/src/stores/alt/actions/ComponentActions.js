import alt from 'src/stores/alt/alt';

class ComponentActions {
  toggleLockState(lockState, actionType) {
    const lockKeyMapping = {
      amount: 'lockAmountColumn',
      amountSolids: 'lockAmountColumnSolids',
      concentration: 'lockConcentration',
      concentrationSolids: 'lockConcentrationSolids',
    };

    const key = lockKeyMapping[actionType];

    return {
      key,
      value: !lockState,
    };
  }
}

export default alt.createActions(ComponentActions);
