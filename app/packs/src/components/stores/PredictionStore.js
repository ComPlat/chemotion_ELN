import _ from 'lodash';

import alt from '../alt';
import PredictionActions from '../actions/PredictionActions';

class PredictionStore {
  constructor() {
    this.activeKey = 0;
    this.template = 'predictProducts';
    this.inputEls = [];
    this.defaultEls = [];
    this.outputEls = [];

    this.bindListeners({
      handleInfer: PredictionActions.infer,
      handleUpdateActiveKey: PredictionActions.updateActiveKey,
      handleUpdateTemplate: PredictionActions.updateTemplate,
      handleUpdateUI: PredictionActions.updateUI,
      handleRemove: PredictionActions.remove,
      handleReset: PredictionActions.reset,
    });
  }

  handleInfer(results) {
    if (results.error) {
      this.setState({ outputEls: [] });
    }

    const outputEls = results.products || results.reactants || [];
    this.setState({ outputEls });
  }

  handleUpdateActiveKey(activeKey) {
    this.setState({ activeKey });
  }

  handleUpdateTemplate(template) {
    this.setState({
      activeKey: 0,
      template,
      inputEls: [],
      defaultEls: [],
      outputEls: [],
    });
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
    const maxNumEls = this.template === 'predictProducts' ? 10 : 1;
    inputEls = inputEls.map(x => ( // avoid including defaultSmis
      uniqLoadSmis.indexOf(x.molecule.cano_smiles) >= 0 ? x : null
    )).filter(r => r != null).filter((val, idx) => idx < maxNumEls);

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
      template: 'predictProducts',
      inputEls: [],
      defaultEls: [],
      outputEls: [],
    });
  }
}

export default alt.createStore(PredictionStore, 'PredictionStore');
