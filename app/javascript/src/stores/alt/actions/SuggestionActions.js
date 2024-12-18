import alt from 'src/stores/alt/alt';
import SuggestionsFetcher from 'src/fetchers/SuggestionsFetcher';

class SuggestionActions {
  fetchSuggestions(endpoint, query) {
    return (dispatch) => {
      SuggestionsFetcher.fetchSuggestions(endpoint, query)
        .then((suggestions) => {
          dispatch(suggestions);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
}

export default alt.createActions(SuggestionActions);
