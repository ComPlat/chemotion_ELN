import React from 'react';

import UIActions from './actions/UIActions';
import UIStore from './stores/UIStore';

import ArrayUtils from './utils/ArrayUtils';

export default class ElementCheckbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: false,
      element: props.element
    }
  }

  updateCheckedStatus(element, state) {
    let checked = this.isChecked(element, state);
    this.setState({checked: checked});
  }

  isChecked(element, state) {
    let type = element.type;
    let uiCheckState = state[type];

    let checkedAll = uiCheckState.checkedAll;
    let checkedIds = uiCheckState.checkedIds;
    let uncheckedIds = uiCheckState.uncheckedIds;

    let checked = (checkedAll && ArrayUtils.isValNotInArray(uncheckedIds, element.id))
                  || ArrayUtils.isValInArray(checkedIds, element.id);

    return checked;
  }

  componentWillReceiveProps(nextProps) {
    let element =  nextProps.element;
    this.setState({
      element: element
    });
    this.updateCheckedStatus(element, UIStore.getState());
  }

  componentDidMount() {
    UIStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.updateCheckedStatus(this.state.element, state);
  }

  toggleCheckbox() {
    let newChecked = !this.state.checked;

    if(newChecked) {
      UIActions.checkElement(this.state.element);
    } else {
      UIActions.uncheckElement(this.state.element);
    }
  }

  render() {
    return (
      <input  type="checkbox"
              onChange={this.toggleCheckbox.bind(this)}
              checked={this.state.checked} />
    )
  }
}
