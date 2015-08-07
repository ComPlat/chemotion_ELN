import alt from '../alt';
import UIActions from '../actions/UIActions';
import ElementStore from './ElementStore';

import ArrayUtils from '../utils/ArrayUtils';
const Immutable = require('immutable');

class UIStore {
  constructor() {
    this.state = {
      checkedSampleIds: Immutable.List(),
      selectedCollectionIds: []
    };

    this.bindListeners({
      handleCheckAllElements: UIActions.checkAllElements,
      handleCheckElement: UIActions.checkElement,
      handleUncheckElement: UIActions.uncheckElement,
      handleUncheckAllElements: UIActions.uncheckAllElements,
      handleDeselectAllElements: UIActions.deselectAllElements,
      handleSelectElement: UIActions.selectElement
    });
  }

  handleCheckAllElements(type) {
    let elements = ElementStore.getState();

    switch(type) {
      case 'sample':
        let sampleIds = elements.samples.map(sample => sample.id);
        this.state.checkedSampleIds = this.state.checkedSampleIds.concat(sampleIds);
        break;
    }
  }

  handleUncheckAllElements(type) {
    switch(type) {
      case 'sample':
        this.state.checkedSampleIds = Immutable.List();
        break;
    }
  }

  handleCheckElement(element) {
    switch(element.type) {
      case 'sample':
        this.state.checkedSampleIds = ArrayUtils.pushUniq(this.state.checkedSampleIds, element.id);
        break;
    }
  }

  handleUncheckElement(element) {
    switch(element.type) {
      case 'sample':
        this.state.checkedSampleIds = ArrayUtils.removeFromListByValue(this.state.checkedSampleIds, element.id);
        break;
    }
  }

  handleDeselectAllElements(type) {
    switch(type) {
      case 'collection':
        this.state.selectedCollectionIds = [];
        break;
    }
  }

  handleSelectElement(element) {
    switch(element.type) {
      case 'collection':
        this.state.selectedCollectionIds.push(element.id);
        break;
    }
  }
}

export default alt.createStore(UIStore, 'UIStore');
