/* eslint-disable class-methods-use-this */
import alt from '../alt';
import ComputeTaskFetcher from '../fetchers/ComputeTaskFetcher';

class ComputeTaskActions {
  fetchAll() {
    return (dispatch) => {
      ComputeTaskFetcher.fetchAll().then(res => (
        dispatch(res)
      )).catch((err) => {
        console.log(err);
      });
    };
  }

  checkState(taskId) {
    return (dispatch) => {
      ComputeTaskFetcher.checkState(taskId).then(res => (
        dispatch(res)
      )).catch((err) => {
        console.log(err);
      });
    };
  }

  revokeTask(taskId) {
    return (dispatch) => {
      ComputeTaskFetcher.revokeTask(taskId).then(res => (
        dispatch(res)
      )).catch((err) => {
        console.log(err);
      });
    };
  }

  deleteTask(taskId) {
    return (dispatch) => {
      ComputeTaskFetcher.deleteTask(taskId).then(res => (
        dispatch(res)
      )).catch((err) => {
        console.log(err);
      });
    };
  }
}

export default alt.createActions(ComputeTaskActions);
