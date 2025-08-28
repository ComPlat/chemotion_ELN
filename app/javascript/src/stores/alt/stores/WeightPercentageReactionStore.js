import alt from 'src/stores/alt/alt';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';

class WeightPercentageReactionStore {
  constructor() {
    this.state = {
      weightPercentageReference: null,
      targetAmount: null,
    };

    this.bindListeners({
      setWeightPercentageReference: this.setWeightPercentageReference,
      setTargetAmountWeightPercentageReference: this.setTargetAmountWeightPercentageReference,
    });
    this.bindActions(WeightPercentageReactionActions);
  }

  setWeightPercentageReference(value) {
    this.setState({
      weightPercentageReference: value,
    });
  }

  setTargetAmountWeightPercentageReference(value) {
    this.setState({
      targetAmount: value,
    });
  }
}

export default alt.createStore(WeightPercentageReactionStore, 'WeightPercentageReactionStore');
