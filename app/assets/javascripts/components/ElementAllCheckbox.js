import React from 'react';

import UIActions from './actions/UIActions';

class ElementAllCheckbox extends React.Component {
  constructor(props) {
    super();
    this.state = {
      checked: false,
      type: props.type
    }
  }

  toggleCheckbox() {
    var newChecked = !this.state.checked;

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

module.exports = ElementAllCheckbox;
