import alt from '../alt';
import UIActions from '../actions/UIActions';

class UIStore {
  constructor() {
    this.state = {
      selectedCollectionIds: []
    };

    this.bindListeners({
      handleDeselectAllElements: UIActions.deselectAllElements,
      handleSelectElement: UIActions.selectElement
    })
  }

  handleDeselectAllElements(type) {
    switch(type) {
      case 'collection':
        this.state.selectedCollectionIds = [];
        break;
    }
  }

  handleSelectElement(element) {
    switch(element.type) {
      case 'collection':
        this.state.selectedCollectionIds.push(element.id);
        break;
    }

  }
}

export default alt.createStore(UIStore, 'UIStore');
