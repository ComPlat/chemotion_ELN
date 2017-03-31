import alt from '../alt';

// An element object has a type and an id, e.g., {type: 'sample', id: 1}
class UIActions {
  showCollectionManagement() {
    return  null;
  }

  toggleCollectionManagement() {
    return  null;
  }

  showElements() {
    return  null;
  }

  selectCollection(collection) {
    return  collection
  }

  selectSyncCollection(syncCollection) {
    return  syncCollection
  }

  checkAllElements(params) {
    return  params;
  }

  toggleShowPreviews() {
    return  null;
  }

  checkElement(params) {
    return  params;
  }

  uncheckAllElements(params) {
    return  params;
  }

  uncheckWholeSelection() {
    return  null;
  }

  uncheckElement(element) {
    return  element;
  }

  selectElement(element) {
    return  element;
  }

  deselectAllElementsOfType(type) {
    return  type;
  }

  deselectAllElements() {
    return  null;
  }

  setPagination(pagination) {
    return  pagination;
  }

  setSearchSelection(selection) {
    return  selection;
  }

  selectCollectionWithoutUpdating(collection) {
    return  collection;
  }

  clearSearchSelection() {
    return  null;
  }

  changeNumberOfResultsShown(value) {
    return  value;
  }

  updateModalProps(params){
    return params
  }

  hideModal(){
    return null
  }
}

export default alt.createActions(UIActions);
