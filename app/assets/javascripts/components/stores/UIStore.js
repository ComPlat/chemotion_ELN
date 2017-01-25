import alt from '../alt';
import UIActions from '../actions/UIActions';
import ElementActions from '../actions/ElementActions';
import ElementStore from './ElementStore';
import ArrayUtils from '../utils/ArrayUtils';
import Immutable from 'immutable';

class UIStore {
  constructor() {
    this.state = {
      sample: {
        checkedAll: false,
        checkedIds: Immutable.List(),
        uncheckedIds: Immutable.List(),
        currentId: null,
        page: 1,
        activeTab: 0,
        activeAnalysis: 0
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
      number_of_results: 15,
      currentCollection: null,
      currentTab: 1,
      currentSearchSelection: null,
      showCollectionManagement: false,
      showDeviceManagement: false,
      isSync: false
    };

    this.bindListeners({
      handleSelectTab: UIActions.selectTab,
      handleSelectSampleTab: UIActions.selectSampleTab,
      handleSelectActiveAnalysis: UIActions.selectActiveAnalysis,
      handleSelectCollection: UIActions.selectCollection,
      handleSelectSyncCollection: UIActions.selectSyncCollection,
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
      handleSelectCollectionWithoutUpdating:
        UIActions.selectCollectionWithoutUpdating,
      handleClearSearchSelection: UIActions.clearSearchSelection,
      handleShowCollectionManagement: UIActions.showCollectionManagement,
      handleShowElements: UIActions.showElements,
      handleToggleCollectionManagement: UIActions.toggleCollectionManagement,
      handleUncheckWholeSelection: UIActions.uncheckWholeSelection,
      handleChangeNumberOfResultsShown: UIActions.changeNumberOfResultsShown,
      handleShowDeviceManagement: UIActions.showDeviceManagement,
      handleCloseDeviceManagement: UIActions.closeDeviceManagement
    });
  }

  handleToggleCollectionManagement() {
    this.state.showCollectionManagement = !this.state.showCollectionManagement;
  }

  handleShowCollectionManagement() {
    this.state.showCollectionManagement = true;
  }

  handleShowDeviceManagement() {
    this.state.showDeviceManagement = true
  }
  
  handleCloseDeviceManagement() {
    this.state.showDeviceManagement = false
  }

  handleShowElements() {
    this.state.showCollectionManagement = false;
  }

  handleSelectTab(tab) {
    this.state.currentTab = tab;
  }

  handleSelectSampleTab(tab) {
    this.state.sample.activeTab = tab;
  }

  handleSelectActiveAnalysis(index) {
    this.state.sample.activeAnalysis = index;
  }

  handleCheckAllElements(type) {
    this.waitFor(ElementStore.dispatchToken);
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
      this.state[type].uncheckedIds =
        ArrayUtils.removeFromListByValue(this.state[type].uncheckedIds,
          element.id);
    }
    else {
      this.state[type].checkedIds =
        ArrayUtils.pushUniq(this.state[type].checkedIds, element.id);
    }

  }

  handleUncheckElement(element) {
    let type = element.type;

    if(this.state[type].checkedAll)
    {
      this.state[type].uncheckedIds =
        ArrayUtils.pushUniq(this.state[type].uncheckedIds, element.id);
    }
    else {
      this.state[type].checkedIds =
        ArrayUtils.removeFromListByValue(this.state[type].checkedIds,
          element.id);
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
    let hasChanged =
      (!state.currentCollection || state.isSync || state.currentCollection.id != collection.id)
      || (state.currentSearchSelection != null);

    if(hasChanged) {
      this.state.isSync = false
      this.state.currentCollection = collection;
      this.state.number_of_results = 15;
      if (!collection.noFetch){
        // FIXME state.pagination is undefined
        // It should be like {page: 1,per_page: 15}.
        ElementActions.fetchSamplesByCollectionId(collection.id,
          state.pagination);
        ElementActions.fetchReactionsByCollectionId(collection.id,
          state.pagination);
        ElementActions.fetchWellplatesByCollectionId(collection.id,
          state.pagination);
        ElementActions.fetchScreensByCollectionId(collection.id,
          state.pagination);
      }
    }
  }

  handleSelectSyncCollection(collection) {
    let state = this.state;
    let hasChanged =
      (!state.currentCollection || !state.isSync || state.currentCollection.id != collection.id)
      || (state.currentSearchSelection != null);

    if(hasChanged) {
      this.state.isSync = true
      let isSync = this.state.isSync
      this.state.currentCollection = collection;
      this.state.number_of_results = 15;
      if (!collection.noFetch){
        // FIXME state.pagination is undefined
        // It should be like {page: 1,per_page: 15}.
        ElementActions.fetchSamplesByCollectionId(collection.id,
          state.pagination, isSync);
        ElementActions.fetchReactionsByCollectionId(collection.id,
          state.pagination, isSync);
        ElementActions.fetchWellplatesByCollectionId(collection.id,
          state.pagination, isSync);
        ElementActions.fetchScreensByCollectionId(collection.id,
          state.pagination, isSync);
      }
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
    this.state.currentCollection = collection;
  }

  handleClearSearchSelection() {
    this.state.currentSearchSelection = null;
  }

  handleChangeNumberOfResultsShown(value) {
    this.state.number_of_results = value;
  }
}

export default alt.createStore(UIStore, 'UIStore');
