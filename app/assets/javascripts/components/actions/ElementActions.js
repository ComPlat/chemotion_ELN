import alt from '../alt';

class ElementActions {
  updateElements(elements) {
    this.dispatch(elements);
  }
}

export default alt.createActions(ElementActions);
