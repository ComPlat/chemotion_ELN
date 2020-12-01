import alt from '../alt';

import ComputeTaskActions from '../actions/ComputeTaskActions';

class ComputeTaskStore {
  constructor() {
    this.state = {
      tasks: [],
    };

    this.bindListeners({
      handleFetchAll: ComputeTaskActions.fetchAll,
      handleUpdateTask: [
        ComputeTaskActions.checkState,
        ComputeTaskActions.revokeTask,
      ]
    });
  }

  handleFetchAll(tasks) {
    this.state.tasks = tasks;
  }

  handleUpdateTask(newTask) {
    const { tasks } = this.state;
    this.state.tasks = tasks.map(task => (
      task.id === newTask.id ? { ...newTask } : task
    ));
  }
}

export default alt.createStore(ComputeTaskStore, 'ComputeTaskStore');
