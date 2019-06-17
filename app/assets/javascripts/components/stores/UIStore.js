import { List, fromJS } from 'immutable';
import alt from '../alt';

import UIActions from '../actions/UIActions';
import ElementActions from '../actions/ElementActions';
import ElementStore from './ElementStore';
import UserStore from './UserStore';
import ArrayUtils from '../utils/ArrayUtils';

class UIStore {
  constructor() {
    this.state = {
      sample: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
        activeTab: 0,
        activeAnalysis: 0,
      },
      reaction: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
        activeTab: 0,
        activeAnalysis: 0,
      },
      wellplate: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
        activeTab: 0,
      },
      screen: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
        activeTab: 0,
      },
      research_plan: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
      },

      showPreviews: true,
      showAdvancedSearch: false,
      fromDate: null,
      toDate: null,
      productOnly: false,
      number_of_results: 15,
      currentCollection: null,
      currentSearchSelection: null,
      showCollectionManagement: false,
      showDeviceManagement: false,
      isSync: false,
      showModal: false,
      modalParams: {},
      hasChemSpectra: false,
    };

    this.bindListeners({
      handleInitialize: UIActions.initialize,
      handleSelectTab: UIActions.selectTab,
      handleSelectActiveAnalysis: UIActions.selectActiveAnalysis,

      handleSelectCollection: UIActions.selectCollection,
      handleSelectSyncCollection: UIActions.selectSyncCollection,
      handleCheckAllElements: UIActions.checkAllElements,
      handleToggleShowPreviews: UIActions.toggleShowPreviews,
      handleToggleAdvancedSearch: UIActions.toggleAdvancedSearch,
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
      handleCloseDeviceManagement: UIActions.closeDeviceManagement,
      handleShowModalChange: UIActions.updateModalProps,
      handleHideModal: UIActions.hideModal,
      handleSetFromDate: UIActions.setFromDate,
      handleSetToDate: UIActions.setToDate,
      handleSetProductOnly: UIActions.setProductOnly,
    });
  }

  handleInitialize(result) {
    this.setState(result);
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

  handleSelectTab(params={}) {
    let type = params.type || "sample"
    let tabKey = params.tabKey || 0
    this.state[type].activeTab = tabKey;
  }

  handleSelectActiveAnalysis(index) {
    this.state.sample.activeAnalysis = index;
  }

  handleCheckAllElements(params) {
    this.waitFor(ElementStore.dispatchToken);

    let {type, range} = params;
    let {elements} = ElementStore.getState();

    if (range == 'all') {
      if (this.state.currentSearchSelection && elements[type + "s"].ids) {
        let ids = elements[type + "s"].ids
        this.state[type].checkedAll = false
        this.state[type].checkedIds = List(ids)
        this.state[type].uncheckedIds = List()
      } else {
        this.state[type].checkedAll = true;
        this.state[type].checkedIds = List();
        this.state[type].uncheckedIds = List();
      }
    } else if (range == 'current') {
      let curPageIds = elements[type + "s"].elements.reduce(
        function(a, b) { return a.concat(b); }, []
      ).map((e) => { return e.id });
      this.state[type].checkedAll = false;
      this.state[type].uncheckedIds = List();
      let checked = this.state[type].checkedIds
      // Remove duplicates, conserve sorting
      if(checked.size > 0) {
        let checkedMap = checked.reduce(function(mp,e){ mp[e]=1; return mp }, {})
        for(var i = 0; i < curPageIds.length; i++){
          if(!checkedMap[curPageIds[i]]) {
            checked = checked.push(curPageIds[i]);
          }
        }
        this.state[type].checkedIds = checked;
      } else {
        this.state[type].checkedIds = List(curPageIds);
      }
    } else {
      this.handleUncheckAllElements(params)
    }
  }

  handleToggleShowPreviews(show) {
    if (show == null) show = !this.state.showPreviews;
    this.state.showPreviews = show;
  }

  handleToggleAdvancedSearch(show) {
    if (show == null) show = !this.state.showAdvancedSearch
    this.state.showAdvancedSearch = show;
  }

  handleUncheckAllElements(params) {
    let {type, range} = params;

    this.state[type].checkedAll = false;
    this.state[type].checkedIds = List();
    this.state[type].uncheckedIds = List();
  }

  handleUncheckWholeSelection() {
    this.handleUncheckAllElements({type: 'sample', range: 'all'});
    this.handleUncheckAllElements({type: 'screen', range: 'all'});
    this.handleUncheckAllElements({type: 'reaction', range: 'all'});
    this.handleUncheckAllElements({type: 'wellplate', range: 'all'});
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

  handleSelectCollection(collection, hasChanged = false) {
    const state = this.state;
    const isSync = collection.is_sync_to_me ? true : false;
    const { fromDate, toDate, productOnly } = state;

    if (!hasChanged) {
      hasChanged = !state.currentCollection;
      hasChanged = hasChanged || state.currentCollection.id != collection.id;
      hasChanged = hasChanged || isSync != state.isSync;
      hasChanged = hasChanged || state.currentSearchSelection != null;
    }

    if (collection['clearSearch']){
      this.handleClearSearchSelection();
      hasChanged = true;
      collection['clearSearch'] = undefined;
    }

    if(hasChanged && !collection.noFetch) {
      this.state.isSync = isSync;
      this.state.currentCollection = collection;
      const per_page = state.number_of_results;
      const params = { per_page, fromDate, toDate, productOnly };

      const { profile } = UserStore.getState();
      if (profile && profile.data && profile.data.layout) {
        const { layout } = profile.data;
        if (layout.sample && layout.sample > 0) {
          ElementActions.fetchSamplesByCollectionId(
            collection.id, Object.assign(params, { page: state.sample.page }),
            isSync, ElementStore.getState().moleculeSort
          );
        }
        if (layout.reaction && layout.reaction > 0) {
          ElementActions.fetchReactionsByCollectionId(
            collection.id, Object.assign(params, { page: state.reaction.page }),
            isSync
          );
        }
        if (layout.wellplate && layout.wellplate > 0) {
          ElementActions.fetchWellplatesByCollectionId(
            collection.id, Object.assign(params, { page: state.wellplate.page }),
            isSync
          );
        }
        if (layout.screen && layout.screen > 0) {
          ElementActions.fetchScreensByCollectionId(
            collection.id, Object.assign(params, { page: state.screen.page }),
            isSync
          );
        }
        if (!isSync && layout.research_plan && layout.research_plan > 0) {
          ElementActions.fetchResearchPlansByCollectionId(
            collection.id,
            Object.assign(params, { page: state.research_plan.page }),
          );
        }
      }
    }
  }

  handleSelectSyncCollection(collection) {
    this.handleSelectCollection(collection)
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
    this.state.isSync = collection.is_sync_to_me ? true : false;
  }

  handleClearSearchSelection() {
    this.state.currentSearchSelection = null;
    this.state.showAdvancedSearch = false;
  }

  handleChangeNumberOfResultsShown(value) {
    this.state.number_of_results = value;
  }
  handleShowModalChange(params){
    this.state.showModal = params.show ? true : false
    this.state.modalParams = params
  }

  handleHideModal(){
    this.state.showModal = false
    this.state.modalParams = {
      show: false,
      title: "",
      component: "",
      action: null
    }
  }

  handleSetFromDate(fromDate) {
    this.state.fromDate = fromDate;
    this.handleSelectCollection(this.state.currentCollection, true);
  }

  handleSetToDate(toDate) {
    this.state.toDate = toDate;
    this.handleSelectCollection(this.state.currentCollection, true);
  }

  handleSetProductOnly(productOnly) {
    this.state.productOnly = productOnly;
    this.handleSelectCollection(this.state.currentCollection, true);
  }
}

export default alt.createStore(UIStore, 'UIStore');
