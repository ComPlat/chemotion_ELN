import React from 'react';

import UIActions from './actions/UIActions';

export default class ElementAllCheckbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: false,
      type: props.type
    }
  }

  toggleCheckbox() {
    let newChecked = !this.state.checked;

    if(newChecked) {
      UIActions.checkAllElements(this.state.type);
      this.setState({checked: true});
    } else {
      UIActions.uncheckAllElements(this.state.type);
      this.setState({checked: false});
    }
  }

  render() {
    return (
      <input type="checkbox" onChange={this.toggleCheckbox.bind(this)} checked={this.state.checked}/>
    )
  }
}
