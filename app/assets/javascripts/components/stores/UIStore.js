import alt from '../alt';
import UIActions from '../actions/UIActions';
import ElementActions from '../actions/ElementActions';
import ElementStore from './ElementStore';

import ArrayUtils from '../utils/ArrayUtils';
const Immutable = require('immutable');

class UIStore {
  constructor() {
    this.state = {
      sample: {
        checkedAll: false,
        checkedIds: Immutable.List(),
        uncheckedIds: Immutable.List(),
        currentId: null,
        page: 1
      },
      reaction: {
        checkedAll: false,
        checkedIds: Immutable.List(),
        uncheckedIds: Immutable.List(),
        currentId: null,
        page: 1
      },
      wellplate: {
        checkedAll: false,
        checkedIds: Immutable.List(),
        uncheckedIds: Immutable.List(),
        currentId: null,
        page: 1
      },
      screen: {
        checkedAll: false,
        checkedIds: Immutable.List(),
        uncheckedIds: Immutable.List(),
        currentId: null,
        page: 1
      },
      showPreviews: true,
      currentCollection: null,
      currentCollectionId: null,
      currentTab: 1,
      currentSearchSelection: null,
      showCollectionManagement: false
    };

    this.bindListeners({
      handleSelectTab: UIActions.selectTab,
      handleSelectCollection: UIActions.selectCollection,
      handleCheckAllElements: UIActions.checkAllElements,
      handleToggleShowPreviews: UIActions.toggleShowPreviews,
      handleCheckElement: UIActions.checkElement,
      handleUncheckElement: UIActions.uncheckElement,
      handleUncheckAllElements: UIActions.uncheckAllElements,
      handleDeselectAllElementsOfType: UIActions.deselectAllElementsOfType,
      handleSelectElement: UIActions.selectElement,
      handleSetPagination: UIActions.setPagination,
      handleDeselectAllElements: UIActions.deselectAllElements,
      handleSetSearchSelection: UIActions.setSearchSelection,
      handleSelectCollectionWithoutUpdating: UIActions.selectCollectionWithoutUpdating,
      handleClearSearchSelection: UIActions.clearSearchSelection,
      handleShowCollectionManagement: UIActions.showCollectionManagement,
      handleShowElements: UIActions.showElements,
      handleToggleCollectionManagement: UIActions.toggleCollectionManagement,
      handleUncheckWholeSelection: UIActions.uncheckWholeSelection
    });
  }

  handleToggleCollectionManagement() {
    this.state.showCollectionManagement = !this.state.showCollectionManagement;
  }

  handleShowCollectionManagement() {
    this.state.showCollectionManagement = true;
  }

  handleShowElements() {
    this.state.showCollectionManagement = false;
  }

  handleSelectTab(tab) {
    this.state.currentTab = tab;
  }

  handleCheckAllElements(type) {
    let {elements} = ElementStore.getState();

    this.state[type].checkedAll = true;
    this.state[type].checkedIds = Immutable.List();
    this.state[type].uncheckedIds = Immutable.List();
  }

  handleToggleShowPreviews() {
    this.state.showPreviews = !this.state.showPreviews;
  }

  handleUncheckAllElements(type) {
    this.state[type].checkedAll = false;
    this.state[type].checkedIds = Immutable.List();
    this.state[type].uncheckedIds = Immutable.List();
  }

  handleUncheckWholeSelection() {
    this.handleUncheckAllElements('sample');
    this.handleUncheckAllElements('screen');
    this.handleUncheckAllElements('reaction');
    this.handleUncheckAllElements('wellplate');
  }

  handleCheckElement(element) {
    let type = element.type;

    if(this.state[type].checkedAll) {
      this.state[type].uncheckedIds = ArrayUtils.removeFromListByValue(this.state[type].uncheckedIds, element.id);
    }
    else {
      this.state[type].checkedIds = ArrayUtils.pushUniq(this.state[type].checkedIds, element.id);
    }

  }

  handleUncheckElement(element) {
    let type = element.type;

    if(this.state[type].checkedAll)
    {
      this.state[type].uncheckedIds = ArrayUtils.pushUniq(this.state[type].uncheckedIds, element.id);
    }
    else {
      this.state[type].checkedIds = ArrayUtils.removeFromListByValue(this.state[type].checkedIds, element.id);
    }
  }

  handleDeselectAllElementsOfType(type) {
    this.state[type].currentId = null;
  }

  handleDeselectAllElements() {
    this.state.sample.currentId = null;
    this.state.reaction.currentId = null;
    this.state.wellplate.currentId = null;
  }

  handleSelectElement(element) {
    this.state[element.type].currentId = element.id;
  }

  handleSelectCollection(collection) {
    let state = this.state;
    let hasChanged = (!state.currentCollection || state.currentCollection.id != collection.id) || (state.currentSearchSelection != null);

    if(hasChanged) {
      // FIXME why both?
      this.state.currentCollection = collection;
      this.state.currentCollectionId = collection.id;

      ElementActions.fetchSamplesByCollectionId(collection.id, state.pagination);
      ElementActions.fetchReactionsByCollectionId(collection.id, state.pagination);
      ElementActions.fetchWellplatesByCollectionId(collection.id, state.pagination);
      ElementActions.fetchScreensByCollectionId(collection.id, state.pagination);
    }
  }

  // FIXME this method is also defined in ElementStore
  handleSetPagination(pagination) {
    let {type, page} = pagination;
    this.state[type].page = page;
  }

  handleSetSearchSelection(selection) {
    this.state.currentSearchSelection = selection;
  }

  handleSelectCollectionWithoutUpdating(collection) {
    // FIXME why both?
    this.state.currentCollection = collection;
    this.state.currentCollectionId = collection.id;
  }

  handleClearSearchSelection() {
    this.state.currentSearchSelection = null;
  }
}

export default alt.createStore(UIStore, 'UIStore');
