import { List, Set, fromJS } from 'immutable';
import alt from 'src/stores/alt/alt';

import UIActions from 'src/stores/alt/actions/UIActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import ArrayUtils from 'src/utilities/ArrayUtils';

const defaultGroupCollapse = {
  baseState: 'expanded',
  except: new Set(),
};

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
        activeAnalysisTab: 0,
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
      cell_line: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
      },
      device_description: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
        activeTab: 0,
        activeAnalysis: 0,
      },
      sequence_based_macromolecule_sample: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
        activeTab: 0,
        activeAnalysis: 0,
      },
      groupCollapse: {},
      isSidebarCollapsed: false,
      vessel: {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
      },
      showPreviews: true,
      showAdvancedSearch: false,
      filterCreatedAt: true,
      fromDate: null,
      toDate: null,
      userLabel: null,
      productOnly: false,
      number_of_results: 15,
      currentCollection: null,
      currentSearchSelection: null,
      currentSearchByID: null,
      showDeviceManagement: false,
      isSync: false,
      hasChemSpectra: false,
      hasNmriumWrapper: false,
      matrices: {},
      thirdPartyApps: [],
      version: {},
      redirectedFromMixture: false,
    };

    this.bindListeners({
      handleInitialize: UIActions.initialize,
      handleSelectTab: UIActions.selectTab,
      handleSelectActiveAnalysis: UIActions.selectActiveAnalysis,
      handleSelectActiveAnalysisTab: UIActions.selectActiveAnalysisTab,

      handleSelectCollection: UIActions.selectCollection,
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
      handleResetGroupCollapse: UIActions.resetGroupCollapse,
      handleExpandAllGroups: UIActions.expandAllGroups,
      handleCollapseAllGroups: UIActions.collapseAllGroups,
      handleToggleGroupCollapse: UIActions.toggleGroupCollapse,
      handleSetSearchSelection: UIActions.setSearchSelection,
      handleSetSearchById: UIActions.setSearchById,
      handleSelectCollectionWithoutUpdating:
        UIActions.selectCollectionWithoutUpdating,
      handleClearSearchSelection: UIActions.clearSearchSelection,
      handleClearSearchById: UIActions.clearSearchById,
      handleUncheckWholeSelection: UIActions.uncheckWholeSelection,
      handleChangeNumberOfResultsShown: UIActions.changeNumberOfResultsShown,
      handleShowDeviceManagement: UIActions.showDeviceManagement,
      handleCloseDeviceManagement: UIActions.closeDeviceManagement,
      handleSetFilterCreatedAt: UIActions.setFilterCreatedAt,
      handleSetUserLabel: UIActions.setUserLabel,
      handleSetFromDate: UIActions.setFromDate,
      handleSetToDate: UIActions.setToDate,
      handleSetProductOnly: UIActions.setProductOnly,
      handleRerenderGenericWorkflow: UIActions.rerenderGenericWorkflow,
      handleShowGenericWorkflowModal: UIActions.showGenericWorkflowModal,
      handleExpandSidebar: UIActions.expandSidebar,
      handleToggleSidebar: UIActions.toggleSidebar,
      handleSetRedirectedFromMixture: UIActions.setRedirectedFromMixture,
    });
  }

  handleInitialize(result) {
    this.setState(result);
    const { klasses } = result;
    klasses?.forEach((klass) => {
      this.state[`${klass}`] = {
        checkedAll: false,
        checkedIds: List(),
        uncheckedIds: List(),
        currentId: null,
        page: 1,
        activeTab: 0,
      };
    });
  }


  handleRerenderGenericWorkflow(params) {
    this.state.propGenericWorkflow = params;
    if (params.toggle) { this.state.showGenericWorkflow = !this.state.showGenericWorkflow; }
  }

  handleShowGenericWorkflowModal(show) {
    this.state.showGenericWorkflow = show;
  }

  handleShowDeviceManagement() {
    this.state.showDeviceManagement = true
  }

  handleCloseDeviceManagement() {
    this.state.showDeviceManagement = false
  }

  handleSelectTab(params = {}) {
    const type = params.type || 'sample';
    const tabKey = params.tabKey || 0;
    this.state[type].activeTab = tabKey;
    this.handleResetGroupCollapse({ type });
  }

  handleResetGroupCollapse(params) {
    if (typeof (params?.type) !== 'undefined') {
      this.state.groupCollapse[params.type] = {
        ...defaultGroupCollapse,
      };
    } else {
      this.state.groupCollapse = {};
    }
  }

  handleExpandAllGroups({ type }) {
    this.state.groupCollapse[type] = {
      baseState: 'expanded',
      except: new Set(),
    };
  }

  handleCollapseAllGroups({ type }) {
    this.state.groupCollapse[type] = {
      baseState: 'collapsed',
      except: new Set(),
    };
  }

  handleToggleGroupCollapse({ type, groupKey }) {
    const groupCollapse = this.state.groupCollapse[type] ?? { ...defaultGroupCollapse };
    this.state.groupCollapse[type] = {
      ...groupCollapse,
      except: groupCollapse.except.has(groupKey)
        ? groupCollapse.except.delete(groupKey)
        : groupCollapse.except.add(groupKey)
    };
  }

  handleSelectActiveAnalysis(params = {}) {
    const type = params.type || 'sample';
    const analysisIndex = params.analysisIndex || 0;
    this.state[type].activeAnalysis = analysisIndex;
  }

  handleSelectActiveAnalysisTab(tabKey) {
    this.state.reaction.activeAnalysisTab = tabKey;
  }

  handleCheckAllElements(params) {
    this.waitFor(ElementStore.dispatchToken);

    const { type, range } = params;
    const { elements } = ElementStore.getState();

    if (range === 'all') {
      if (elements[`${type}s`].ids) {
        const { ids } = elements[`${type}s`];
        this.state[type].checkedAll = false;
        this.state[type].checkedIds = List(ids);
        this.state[type].uncheckedIds = List();
      } else {
        this.state[type].checkedAll = true;
        this.state[type].checkedIds = List();
        this.state[type].uncheckedIds = List();
      }
    } else if (range == 'current') {
      let curPageIds = elements[type + "s"].elements.reduce(
        function (a, b) { return a.concat(b); }, []
      ).map((e) => { return e.id });
      this.state[type].checkedAll = false;
      this.state[type].uncheckedIds = List();
      let checked = this.state[type].checkedIds
      // Remove duplicates, conserve sorting
      if (checked.size > 0) {
        let checkedMap = checked.reduce(function (mp, e) { mp[e] = 1; return mp }, {})
        for (var i = 0; i < curPageIds.length; i++) {
          if (!checkedMap[curPageIds[i]]) {
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
    let { type, range } = params;

    if (this.state[type]) {
      this.state[type].checkedAll = false;
      this.state[type].checkedIds = List();
      this.state[type].uncheckedIds = List();
    }
  }

  handleUncheckWholeSelection() {
    this.handleUncheckAllElements({ type: 'sample', range: 'all' });
    this.handleUncheckAllElements({ type: 'screen', range: 'all' });
    this.handleUncheckAllElements({ type: 'reaction', range: 'all' });
    this.handleUncheckAllElements({ type: 'wellplate', range: 'all' });
    this.handleUncheckAllElements({ type: 'research_plan', range: 'all' });
    this.handleUncheckAllElements({ type: 'cell_line', range: 'all' });
    this.handleUncheckAllElements({ type: 'device_description', range: 'all' });
    this.handleUncheckAllElements({ type: 'vessel', range: 'all' });
    this.handleUncheckAllElements({ type: 'sequence_based_macromolecule_sample', range: 'all' });
    this.state.klasses?.forEach((klass) => { this.handleUncheckAllElements({ type: klass, range: 'all' }); });
  }

  handleCheckElement(element) {
    let type = element.type;

    if (this.state[type].checkedAll) {
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

    if (this.state[type].checkedAll) {
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
    this.state.research_plan.currentId = null;
    this.state.device_description.currentId = null;
    this.state.sequence_based_macromolecule_sample.currentId = null;
  }

  handleSelectElement(element) {
    this.state[element.type].currentId = element.id;
  }

  handleSelectCollection(collection, hasChanged = false) {
    const state = this.state;
    const isSync = collection.is_sync_to_me ? true : false;
    const { filterCreatedAt, fromDate, toDate, userLabel, productOnly } = state;

    if (!hasChanged) {
      hasChanged = !state.currentCollection;
      hasChanged = hasChanged || state.currentCollection.id != collection.id;
      hasChanged = hasChanged || isSync != state.isSync;
      hasChanged = hasChanged || state.currentSearchSelection != null;
      hasChanged = hasChanged || state.currentSearchByID != null;
    }

    if (collection['clearSearch']) {
      this.handleClearSearchSelection();
      hasChanged = true;
      collection['clearSearch'] = undefined;
    }

    if (hasChanged && !collection.noFetch) {
      this.state.isSync = isSync;
      this.state.currentCollection = collection;
      const per_page = state.number_of_results;
      const params = { per_page, filterCreatedAt, fromDate, toDate, userLabel, productOnly };
      const { profile } = UserStore.getState();

      if (profile && profile.data && profile.data.layout) {
        const { layout } = profile.data;

        if (state.currentSearchByID) {
          this.handleSelectCollectionForSearchById(layout, collection);
        } else {
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
          if (!isSync && layout.cell_line && layout.cell_line > 0) {
            ElementActions.fetchCellLinesByCollectionId(
              collection.id,
              Object.assign(params, { page: state.cell_line.page }),
            );
          }
          if (!isSync && layout.device_description && layout.device_description > 0) {
            ElementActions.fetchDeviceDescriptionsByCollectionId(
              collection.id,
              Object.assign(params, { page: state.device_description.page }),
            );
          }
          if (!isSync && layout.vessel && layout.vessel > 0) {
            ElementActions.fetchVesselsByCollectionId(
              collection.id,
              Object.assign(params, { page: state.vessel.page }),
            );
          }

          if (!isSync && layout.sequence_based_macromolecule_sample && layout.sequence_based_macromolecule_sample > 0) {
            ElementActions.fetchSequenceBasedMacromoleculeSamplesByCollectionId(
              collection.id,
              Object.assign(params, { page: state.sequence_based_macromolecule_sample.page }),
            );
          }

          const elements = [
            'sample', 'reaction', 'screen', 'wellplate', 'research_plan', 'vessel',
            'cell_line', 'device_description', 'sequence_based_macromolecule_sample',
          ];

          Object.keys(layout)
            .filter(l => !elements.includes(l))
            .forEach((key) => {
              if (typeof layout[key] !== 'undefined' && layout[key] > 0) {
                const page = state[key] ? state[key].page : 1;
                ElementActions.fetchGenericElsByCollectionId(
                  collection.id,
                  Object.assign(params, { page, name: key }),
                  isSync,
                  key
                );
              }
            });
        }
      }
    }
  }

  handleSelectCollectionForSearchById(layout, collection) {
    const state = this.state;
    const isSync = state.isSync;
    const searchResult = { ...state.currentSearchByID };
    const { filterCreatedAt, fromDate, toDate, userLabel, productOnly } = state;
    const { moleculeSort } = ElementStore.getState();
    const per_page = state.number_of_results;

    Object.keys(state.currentSearchByID).forEach((key) => {
      if (layout[key.slice(0, -1)] > 0 && searchResult[key].totalElements > 0) {
        if (productOnly && key != 'samples') { return }
        let filterParams = {};
        const elnElements = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
        let modelName = !elnElements.includes(key.slice(0, -1)) ? 'element' : key.slice(0, -1);

        if (fromDate || toDate || productOnly || userLabel) {
          filterParams = {
            filter_created_at: filterCreatedAt,
            from_date: fromDate,
            to_date: toDate,
            user_label: userLabel,
            product_only: productOnly,
          }
        }

        const with_filter = Object.keys(filterParams).length >= 1 ? true : false;

        const selection = {
          elementType: 'by_ids',
          id_params: {
            model_name: modelName,
            ids: searchResult[key].ids,
            total_elements: searchResult[key].totalElements,
            with_filter: with_filter,
          },
          list_filter_params: filterParams,
          search_by_method: 'search_by_ids',
          page_size: per_page
        };

        ElementActions.fetchBasedOnSearchResultIds.defer({
          selection,
          collectionId: collection.id,
          isSync: isSync,
          page_size: per_page,
          page: searchResult[key].page,
          moleculeSort
        });
      }
    });
  }

  // FIXME this method is also defined in ElementStore
  handleSetPagination(pagination) {
    let { type, page } = pagination;
    this.state[type].page = page;
  }

  handleSetSearchSelection(selection) {
    this.state.currentSearchSelection = selection;
  }

  handleSetSearchById(selection) {
    this.state.currentSearchByID = selection;
  }

  handleSelectCollectionWithoutUpdating(collection) {
    this.state.currentCollection = collection;
    this.state.isSync = collection.is_sync_to_me ? true : false;
  }

  handleClearSearchSelection() {
    this.state.currentSearchSelection = null;
    this.state.showAdvancedSearch = false;
  }

  handleClearSearchById() {
    this.state.currentSearchByID = null;
  }

  handleChangeNumberOfResultsShown(value) {
    this.state.number_of_results = value;
  }

  handleSetFilterCreatedAt(filterCreatedAt) {
    this.state.filterCreatedAt = filterCreatedAt;
    if (this.state.fromDate != null || this.state.toDate != null) {
      this.handleSelectCollection(this.state.currentCollection, true);
    }
  }

  handleSetUserLabel(label) {
    this.state.userLabel = label;
    this.handleSelectCollection(this.state.currentCollection, true);
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

  handleExpandSidebar() {
    this.setState({ isSidebarCollapsed: false });
  }

  handleToggleSidebar() {
    this.setState({ isSidebarCollapsed: !this.state.isSidebarCollapsed });
  }

  handleSetRedirectedFromMixture(value) {
    this.state.redirectedFromMixture = value;
  }
}

export default alt.createStore(UIStore, 'UIStore');
