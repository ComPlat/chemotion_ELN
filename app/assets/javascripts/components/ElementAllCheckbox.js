import React from 'react';

import UIActions from './actions/UIActions';

export default class ElementAllCheckbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: props.checked ? props.checked : false,
      type: props.type
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      checked: nextProps.checked,
      type: nextProps.type
    })
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
      <input type="checkbox" onChange={this.toggleCheckbox.bind(this)}
        checked={this.state.checked ? this.state.checked : false}
        disabled={this.props.showReport}
        />
    )
  }
}
