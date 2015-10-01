import alt from '../alt';
import SuggestionsFetcher from '../fetchers/SuggestionsFetcher';

class SuggestionActions {
  fetchSuggestions(endpoint, query) {
    SuggestionsFetcher.fetchSuggestions(endpoint, query)
      .then((suggestions) => {
        this.dispatch(suggestions);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}

export default alt.createActions(SuggestionActions);
