/* eslint-disable class-methods-use-this */
import alt from 'src/stores/alt/alt';

class GasPhaseReactionActions {
  handleGasButtonStatusChange() {
    return null;
  }

  gaseousReaction(boolean) {
    return boolean;
  }

  setCatalystReferenceMole(value) {
    return value;
  }

  setReactionVesselSize(value) {
    return value;
  }
}

export default alt.createActions(GasPhaseReactionActions);
