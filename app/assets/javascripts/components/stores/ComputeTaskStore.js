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
      ],
      handleDeleteTask: ComputeTaskActions.deleteTask
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

  handleDeleteTask(deletedTask) {
    const { tasks } = this.state;
    this.state.tasks = tasks.filter(task => task.id !== deletedTask.id);
  }
}

export default alt.createStore(ComputeTaskStore, 'ComputeTaskStore');
