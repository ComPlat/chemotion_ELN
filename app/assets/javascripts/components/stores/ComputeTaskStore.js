import alt from '../alt';

import ComputeTaskActions from '../actions/ComputeTaskActions';

class ComputeTaskStore {
  constructor() {
    this.state = {
      tasks: [],
    };

    this.bindListeners({
      handleFetchAll: ComputeTaskActions.fetchAll,
    });
  }

  handleFetchAll(tasks) {
    this.state.tasks = tasks;
  }
}

export default alt.createStore(ComputeTaskStore, 'ComputeTaskStore');
