import alt from '../alt';
import UIActions from '../actions/UIActions';
import UserActions from '../actions/UserActions';
import ElementActions from '../actions/ElementActions';
import ElementStore from './ElementStore';
import UserStore from './UserStore';
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
      research_plan: {
        checkedAll: false,
        checkedIds: Immutable.List(),
        uncheckedIds: Immutable.List(),
        currentId: null,
        page: 1
      },
      showPreviews: true,
      number_of_results: 15,
      currentCollection: null,
      currentSearchSelection: null,
      showCollectionManagement: false,
      isSync: false,
      showModal: false,
      modalParams: {},
    };

    this.bindListeners({
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
      handleShowModalChange: UIActions.updateModalProps,
      handleHideModal: UIActions.hideModal,
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

  handleCheckAllElements(params) {
    this.waitFor(ElementStore.dispatchToken);

    let {type, range} = params;
    let {elements} = ElementStore.getState();

    if (range == 'all') {
      if (this.state.currentSearchSelection && elements[type + "s"].ids) {
        let ids = elements[type + "s"].ids
        this.state[type].checkedAll = false
        this.state[type].checkedIds = Immutable.List(ids)
        this.state[type].uncheckedIds = Immutable.List()
      } else {
        this.state[type].checkedAll = true;
        this.state[type].checkedIds = Immutable.List();
        this.state[type].uncheckedIds = Immutable.List();
      }
    } else if (range == 'current') {
      let curPageIds = elements[type + "s"].elements.reduce(
        function(a, b) { return a.concat(b); }, []
      ).map((e) => { return e.id });

      this.state[type].checkedAll = false;
      this.state[type].uncheckedIds = Immutable.List();
      this.state[type].checkedIds = this.state[type].checkedIds.concat(curPageIds)
    } else {
      this.handleUncheckAllElements(params)
    }
  }

  handleToggleShowPreviews() {
    this.state.showPreviews = !this.state.showPreviews;
  }

  handleUncheckAllElements(params) {
    let {type, range} = params;

    this.state[type].checkedAll = false;
    this.state[type].checkedIds = Immutable.List();
    this.state[type].uncheckedIds = Immutable.List();
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
        ElementActions.fetchResearchPlansByCollectionId(collection.id,
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
}

export default alt.createStore(UIStore, 'UIStore');
