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
  SetFeedStockReferenceMolValue(value) {
    return value;
  }
}

export default alt.createActions(GaseousReactionActions);
