import alt from 'src/stores/alt/alt';

class GaseousReactionActions {
  // eslint-disable-next-line class-methods-use-this
  handleGasButtonStatusChange() {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  gaseousReaction(boolean) {
    return boolean;
  }

  // eslint-disable-next-line class-methods-use-this
  setCatalystReferenceMole(value) {
    return value;
  }

  // eslint-disable-next-line class-methods-use-this
  setReactionVesselSize(value) {
    return value;
  }
}

export default alt.createActions(GaseousReactionActions);
