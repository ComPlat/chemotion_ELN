import alt from 'src/stores/alt/alt';
import SuggestionActions from 'src/stores/alt/actions/SuggestionActions';

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
