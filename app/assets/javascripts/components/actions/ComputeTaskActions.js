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
}

export default alt.createActions(ComputeTaskActions);
