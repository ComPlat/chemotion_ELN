import alt from '../alt';
import QcActions from '../actions/QcActions';

class QcStore {
  constructor() {
    this.infers = [];
    this.loading = false;

    this.bindListeners({
      handleLoadInfers: QcActions.loadInfers,
      handleSetLoading: QcActions.setLoading,
    });
  }

  handleSetLoading() {
    this.setState({ loading: true });
  }

  handleLoadInfers({ result, sId }) {
    const infer = { sId, result };
    const prevInfers = this.infers
      .map(i => ((i.sId !== sId) ? i : null))
      .filter(r => r != null);
    const nextInfers = [...prevInfers, infer];

    this.setState({
      loading: false,
      infers: nextInfers,
    });
  }
}

export default alt.createStore(QcStore, 'QcStore');
