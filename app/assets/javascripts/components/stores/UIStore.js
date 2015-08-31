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
      currentCollectionId: null,
      pagination: null
    };

    this.bindListeners({
      handleSelectCollection: UIActions.selectCollection,
      handleCheckAllElements: UIActions.checkAllElements,
      handleCheckElement: UIActions.checkElement,
      handleUncheckElement: UIActions.uncheckElement,
      handleUncheckAllElements: UIActions.uncheckAllElements,
      handleDeselectAllElements: UIActions.deselectAllElements,
      handleSelectElement: UIActions.selectElement,
      handleSetPagination: UIActions.setPagination,
      handleRefreshSamples: ElementActions.updateSample
    });
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

    // TODO also for reactions and so on
    switch(element.type) {
      case 'sample':
        ElementActions.fetchSampleById(element.id)
        break;
    }
  }

  handleSelectCollection(collection) {
    this.state.currentCollectionId = collection.id;
    // TODO also for reactions and so on
    ElementActions.fetchSamplesByCollectionId(collection.id, this.state.pagination)
  }

  handleSetPagination(pagination) {
    this.state.pagination = pagination;
  }

  handleRefreshSamples() {
    ElementActions.fetchSamplesByCollectionId(this.state.currentCollectionId, this.state.pagination)
  }
}

export default alt.createStore(UIStore, 'UIStore');
