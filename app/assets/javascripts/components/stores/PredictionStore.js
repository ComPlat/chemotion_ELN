import _ from 'lodash';

import alt from '../alt';
import PredictionActions from '../actions/PredictionActions';

class PredictionStore {
  constructor() {
    this.activeKey = 0;
    this.template = 'predictProd';
    this.inputEls = [];
    this.defaultEls = [];
    this.outputEls = [];

    this.bindListeners({
      handlePredictProducts: PredictionActions.predictProducts,
      handleUpdateActiveKey: PredictionActions.updateActiveKey,
      handleUpdateTemplate: PredictionActions.updateTemplate,
      handleUpdateUI: PredictionActions.updateUI,
      handleRemove: PredictionActions.remove,
      handleReset: PredictionActions.reset,
    });
  }

  handlePredictProducts(results) {
    const outputEls = results.error ? [] : results.products;
    this.setState({ outputEls });
  }

  handleUpdateActiveKey(activeKey) {
    this.setState({ activeKey });
  }

  handleUpdateTemplate(template) {
    this.setState({ template });
  }

  handleUpdateUI(result) {
    if (!result) return null;
    const { samples } = result;
    if (!samples) return null;
    const defaultSmis = this.defaultEls.map(x => x.molecule.cano_smiles);
    const rspSmis = samples.map(x => x.molecule.cano_smiles);
    let uniqLoadSmis = _.difference(rspSmis, defaultSmis);
    uniqLoadSmis = [...new Set(uniqLoadSmis)];
    let inputEls = samples.filter((x, idx) => ( // avoid 2 samples with the same smiles
      rspSmis.indexOf(x.molecule.cano_smiles) === idx
    ));
    inputEls = inputEls.map(x => ( // avoid including defaultSmis
      uniqLoadSmis.indexOf(x.molecule.cano_smiles) >= 0 ? x : null
    )).filter(r => r != null).filter((val, idx) => idx < 3);

    this.setState({ inputEls });
    return null;
  }

  handleRemove(el) {
    const inputEls = this.inputEls.filter(x => x.id !== el.id);
    this.setState({ inputEls });
  }

  handleReset() {
    this.setState({
      activeKey: 0,
      template: 'predictProd',
      inputEls: [],
      defaultEls: [],
      outputEls: [],
    });
  }
}

export default alt.createStore(PredictionStore, 'PredictionStore');
