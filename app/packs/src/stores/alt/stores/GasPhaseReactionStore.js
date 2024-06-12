import alt from 'src/stores/alt/alt';
import GaseousReactionActions from 'src/stores/alt/actions/GaseousReactionActions';

class GasPhaseReactionStore {
  constructor() {
    this.state = {
      gaseousReactionStatus: false,
      catalystReferenceMolValue: null,
      feedStockReferenceVolumeValue: null,
    };

    this.bindListeners({
      handleGasButtonStatusChange: this.handleGasButtonStatusChange,
      gaseousReaction: this.gaseousReaction,
      setCatalystReferenceMole: this.setCatalystReferenceMole,
      setFeedStockReferenceVolume: this.setFeedStockReferenceVolume,
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

  setCatalystReferenceMole(value) {
    this.setState({
      catalystReferenceMolValue: value,
    });
  }

  setFeedStockReferenceVolume(value) {
    this.setState({
      feedStockReferenceVolumeValue: value,
    });
  }
}

export default alt.createStore(GasPhaseReactionStore, 'GasPhaseReactionStore');
