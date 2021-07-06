import alt from '../alt';
import SuggestionsFetcher from '../fetchers/SuggestionsFetcher';

class SuggestionActions {
  fetchSuggestions(endpoint, query) {
    return (dispatch) => {  SuggestionsFetcher.fetchSuggestions(endpoint, query)
      .then((suggestions) => {
        dispatch(suggestions);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }
}

export default alt.createActions(SuggestionActions);
