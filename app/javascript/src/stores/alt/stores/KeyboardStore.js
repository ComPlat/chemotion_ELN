import alt from 'src/stores/alt/alt';
import KeyboardActions from 'src/stores/alt/actions/KeyboardActions';

class KeyboardStore {
  constructor() {
    this.state = {
      context: "sample",
      documentKeyDownCode: null
    };

    this.bindListeners({
      handleDocumentKeyDown: KeyboardActions.documentKeyDown,
      handleContextChange: KeyboardActions.contextChange
    })
  }

  handleDocumentKeyDown(keyCode) {
    this.state.documentKeyDownCode = keyCode
  }

  handleContextChange(context) {
    this.state.context = context
  }
}

export default alt.createStore(KeyboardStore, 'KeyboardStore');
