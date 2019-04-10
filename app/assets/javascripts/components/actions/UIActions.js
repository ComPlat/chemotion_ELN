import alt from '../alt';
import UIFetcher from '../fetchers/UIFetcher';

// An element object has a type and an id, e.g., {type: 'sample', id: 1}
class UIActions {
  initialize() {
    return (dispatch) => {
      UIFetcher.initialize()
        .then(json => dispatch(json))
        .catch(err => console.log(err)); // eslint-disable-line
    };
  }

  showCollectionManagement() {
    return  null;
  }

  toggleCollectionManagement() {
    return  null;
  }

  showElements() {
    return  null;
  }

  showDeviceManagement() {
    return null
  }

  closeDeviceManagement() {
    return null
  }

  selectTab(params) {
    return params;
  }

  selectActiveAnalysis(index) {
    return index;
  }

  toggleAdvancedSearch(show) {
    return show
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

  toggleShowPreviews(show) {
    return  show;
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

  setFromDate(date) {
    return date;
  }

  setToDate(date) {
    return date;
  }

  setProductOnly(bool) {
    return bool;
  }
}

export default alt.createActions(UIActions);
