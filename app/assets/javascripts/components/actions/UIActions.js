import alt from '../alt';

// An element object has a type and an id, e.g., {type: 'sample', id: 1}
class UIActions {
  selectTab(tab) {
    this.dispatch(tab);
  }

  selectCollection(collection) {
    this.dispatch(collection)
  }

  checkAllElements(type) {
    this.dispatch(type);
  }

  toggleShowPreviews() {
    this.dispatch();
  }

  checkElement(element) {
    this.dispatch(element);
  }

  uncheckAllElements(type) {
    this.dispatch(type);
  }

  uncheckElement(element) {
    this.dispatch(element);
  }

  selectElement(element) {
    this.dispatch(element);
  }

  deselectAllElementsOfType(type) {
    this.dispatch(type);
  }

  deselectAllElements() {
    this.dispatch();
  }

  setPagination(pagination) {
    this.dispatch(pagination);
  }

  setSearchSelection(selection) {
    this.dispatch(selection);
  }

  selectCollectionWithoutUpdating(collection) {
    this.dispatch(collection);
  }

  clearSearchSelection() {
    this.dispatch();
  }
}

export default alt.createActions(UIActions);
