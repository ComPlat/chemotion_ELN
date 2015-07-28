import alt from '../alt';

class UIActions {
  selectElement(element) {
    this.dispatch(element);
  }

  deselectAllElements(type) {
    this.dispatch(type);
  }
}

export default alt.createActions(UIActions);
