import alt from 'src/stores/alt/alt';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';

class WeightPercentageReactionStore {
  constructor() {
    this.state = {
      productReference: null,
      targetAmount: null,
    };

    this.bindListeners({
      setProductReference: this.setProductReference,
      setTargetAmountProductReference: this.setTargetAmountProductReference,
    });
    this.bindActions(WeightPercentageReactionActions);
  }

  setProductReference(value) {
    this.setState({
      productReference: value,
    });
  }

  setTargetAmountProductReference(value) {
    this.setState({
      targetAmount: value,
    });
  }
}

export default alt.createStore(WeightPercentageReactionStore, 'WeightPercentageReactionStore');
