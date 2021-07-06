import alt from '../alt';
import SuggestionActions from '../actions/SuggestionActions';

class SuggestionStore {
  constructor() {
    this.state = {
      suggestions: []
    };

    this.bindListeners({
      handleFetchSuggestions: SuggestionActions.fetchSuggestions
    })
  }

  handleFetchSuggestions(suggestions) {
    this.state.suggestions = suggestions;
  }
}

export default alt.createStore(SuggestionStore, 'SuggestionStore');
