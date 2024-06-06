import alt from 'src/stores/alt/alt';
import GaseousReactionActions from 'src/stores/alt/actions/GaseousReactionActions';

class GasPhaseReactionStore {
  constructor() {
    this.state = {
      gaseousReactionStatus: false,
      feedStockReferenceMolValue: null,
    };

    this.bindListeners({
      handleGasButtonStatusChange: this.handleGasButtonStatusChange,
      gaseousReaction: this.gaseousReaction,
      SetFeedStockReferenceMolValue: this.SetFeedStockReferenceMolValue,
    });
    this.bindActions(GaseousReactionActions);
  }

  handleGasButtonStatusChange() {
    this.setState({
      gaseousReactionStatus: !this.state.gaseousReactionStatus,
    });
  }

  gaseousReaction(boolean) {
    this.setState({
      gaseousReactionStatus: boolean,
    });
  }

  SetFeedStockReferenceMolValue(value) {
    this.setState({
      feedStockReferenceMolValue: value,
    });
  }
}

export default alt.createStore(GasPhaseReactionStore, 'GasPhaseReactionStore');
