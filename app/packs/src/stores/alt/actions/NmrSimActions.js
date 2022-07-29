import alt from 'src/stores/alt/alt';
import NmrSimFetcher from 'src/fetchers/NmrSimFetcher';

class NmrSimActions {
  updateNmrdb(type, needToFetch, id) {
    if (needToFetch) {
      return (dispatch) => {
        NmrSimFetcher.fetchNmrdbById(id)
          .then((result) => {
            dispatch({ type, spectrum: result });
          }).catch((errorMessage) => {
            console.log(errorMessage);
          });
      };
    }
    const spectrum = false;
    return { type, spectrum };
  }

  resetNMR() {
    return null;
  }
}

export default alt.createActions(NmrSimActions);
