import alt from 'src/stores/alt/alt';
import GaseousReactionActions from 'src/stores/alt/actions/GaseousReactionActions';

class GasPhaseReactionStore {
  constructor() {
    this.state = {
      gaseousReactionStatus: false,
    };

    this.bindListeners({
      handleGasButtonStatusChange: this.handleGasButtonStatusChange,
      gaseousReaction: this.gaseousReaction,
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
}

export default alt.createStore(GasPhaseReactionStore, 'GasPhaseReactionStore');
