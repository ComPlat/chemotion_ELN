import React from 'react';

import UIActions from './actions/UIActions';
import UIStore from './stores/UIStore';

import ArrayUtils from './utils/ArrayUtils';

class ElementCheckbox extends React.Component {
  constructor(props) {
    super();
    this.state = {
      checked: false,
      element: props.element
    }
  }

  updateCheckedStatus(element) {
    var checkedSampleIds = UIStore.getState().checkedSampleIds;
    
    switch(element.type) {
      case 'sample':
        if(ArrayUtils.isValInArray(checkedSampleIds, element.id)) {
          this.setState({checked: true});
        } else {
          this.setState({checked: false});
        }
    }
  }

  componentWillReceiveProps(nextProps) {
    // TODO based on type
    var element =  nextProps.element;

    this.setState({
      element: element
    });

    this.updateCheckedStatus(element);
  }

  componentDidMount() {
    this.updateCheckedStatus(this.state.element);
    UIStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    var thisType = this.state.element.type;
    var thisId = this.state.element.id;

    switch(thisType) {
      case 'sample':
        if(ArrayUtils.isValInArray(state.checkedSampleIds, thisId)) {
          this.setState({checked: true});
        } else {
          this.setState({checked: false});
        }
    }
  }

  toggleCheckbox() {
    var newChecked = !this.state.checked;

    if(newChecked) {
      UIActions.checkElement(this.state.element);
    } else {
      UIActions.uncheckElement(this.state.element);
    }
  }

  render() {
    return (
      <input type="checkbox" onChange={this.toggleCheckbox.bind(this)} checked={this.state.checked}/>
    )
  }
}

module.exports = ElementCheckbox;
