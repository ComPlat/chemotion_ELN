import alt from '../alt';
import LoadingActions from '../actions/LoadingActions';
import ReportActions from '../actions/ReportActions';

class LoadingStore {
  constructor() {
    this.loading = false;

    this.bindListeners({
      handleStart: LoadingActions.start,
      handleStop:
        [
          LoadingActions.stop,
          ReportActions.clone,
        ],
    });
  }

  handleStart() {
    this.setState({ loading: true });
  }

  handleStop() {
    this.setState({ loading: false });
  }
}

export default alt.createStore(LoadingStore, 'LoadingStore');
