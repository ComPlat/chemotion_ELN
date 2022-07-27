import alt from 'src/components/alt';
import SuggestionActions from 'src/components/actions/SuggestionActions';

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
