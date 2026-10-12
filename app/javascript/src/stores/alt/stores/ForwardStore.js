import alt from 'src/stores/alt/alt';
import ForwardActions from 'src/stores/alt/actions/ForwardActions';
import { layoutForward } from 'src/apps/mydb/elements/details/predictions/forwardTree';

// The canvas is always derived from the dropped inputs and the latest
// prediction, so re-running Synthesize replaces the products instead of
// stacking a second set on top.
const emptyState = () => ({
  reactant: '',
  reagent: '',
  solvent: '',
  // Input node id -> { smiles, png } of the dropped sample.
  inputs: {},
  outcomes: [],
  tree: {},
  newSample: {},
  loading: false,
  ...layoutForward(),
});

class ForwardStore {
  constructor() {
    this.state = emptyState();

    this.bindListeners({
      handleUpdateElements: ForwardActions.handleChange,
      handleFetchApiResponse: ForwardActions.fetchApiResponse,
      handleMoleculeSave: ForwardActions.handleSave,
      handleReset: ForwardActions.resetForward,
    });
  }

  getState() {
    return this.state;
  }

  handleUpdateElements(action) {
    // Each drop fills one of the fixed input nodes (ids match the labels).
    const targets = {
      UPDATE_REACTANT: ['reactant', 'Reactant'],
      UPDATE_REAGENT: ['reagent', 'Reagent'],
      UPDATE_SOLVENT: ['solvent', 'Solvent'],
    };

    if (action.type === 'ERROR') {
      console.warn('Error while fetch:', action.error);
      return;
    }
    if (!targets[action.type]) return;

    const [key, nodeId] = targets[action.type];
    const { sample, png, smiles } = action.payload;
    const inputs = { ...this.state.inputs, [nodeId]: { smiles, png } };
    // Products predicted from the previous inputs no longer apply.
    this.setState({
      [key]: sample, inputs, outcomes: [], ...layoutForward(inputs, [])
    });
  }

  handleFetchApiResponse(action) {
    if (action.payload?.error) {
      this.setState({ loading: false });
      return;
    }
    const { tree } = action.payload;
    const outcomes = tree.outcomes || [];
    this.setState({
      tree, outcomes, loading: false, ...layoutForward(this.state.inputs, outcomes)
    });
  }

  handleMoleculeSave(action) {
    this.setState({ newSample: action.payload.new });
  }

  handleReset() {
    this.setState(emptyState());
  }
}

export default alt.createStore(ForwardStore, 'ForwardStore');
