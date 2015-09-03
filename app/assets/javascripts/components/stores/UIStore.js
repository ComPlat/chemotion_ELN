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
        currentId: null
      },
      reaction: {
        checkedAll: false,
        checkedIds: Immutable.List(),
        uncheckedIds: Immutable.List(),
        currentId: null
      },
      currentCollectionId: null,
      currentTab: 1,

      pagination: {
        sample: {
          page: 1
        },
        reaction: {
          page: 1
        }
      }
    };

    this.bindListeners({
      handleSelectTab: UIActions.selectTab,
      handleSelectCollection: UIActions.selectCollection,
      handleCheckAllElements: UIActions.checkAllElements,
      handleCheckElement: UIActions.checkElement,
      handleUncheckElement: UIActions.uncheckElement,
      handleUncheckAllElements: UIActions.uncheckAllElements,
      handleDeselectAllElements: UIActions.deselectAllElements,
      handleSelectElement: UIActions.selectElement,
      handleSetPagination: UIActions.setPagination
    });
  }

  handleSelectTab(tab) {
    console.log('handleSelectTab: ' + tab)
    this.state.currentTab = tab;
  }

  handleCheckAllElements(type) {
    let {elements} = ElementStore.getState();

    this.state[type].checkedAll = true;
    this.state[type].checkedIds = Immutable.List();
    this.state[type].uncheckedIds = Immutable.List();
  }

  handleUncheckAllElements(type) {
    this.state[type].checkedAll = false;
    this.state[type].checkedIds = Immutable.List();
    this.state[type].uncheckedIds = Immutable.List();
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

  handleDeselectAllElements(type) {
    this.state[type].currentId = null;
  }

  handleSelectElement(element) {
    this.state[element.type].currentId = element.id;

    // TODO also for wellplates
    switch(element.type) {
      case 'sample':
        ElementActions.fetchSampleById(element.id)
        break;
      case 'reaction':
        ElementActions.fetchReactionById(element.id)
        break;
    }
  }

  handleSelectCollection(collection) {
    let hasChanged = this.state.currentCollectionId != collection.id;
    this.state.currentCollectionId = collection.id;

    // TODO also for wellplates and so on
    if(hasChanged) {
      ElementActions.fetchSamplesByCollectionId(collection.id, this.state.pagination)
      ElementActions.fetchReactionsByCollectionId(collection.id, this.state.pagination)
    }
  }

  handleSetPagination(pagination) {
    let {type, page} = pagination
    this.state.pagination[pagination.type] = {page: page};
  }

}

export default alt.createStore(UIStore, 'UIStore');
