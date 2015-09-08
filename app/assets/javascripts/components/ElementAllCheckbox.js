import React from 'react';

import UIActions from './actions/UIActions';
import UIStore from './stores/UIStore';


export default class ElementAllCheckbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: false,
      type: props.type
    }
  }
  
  componentDidMount() {
    UIStore.listen(this.onChangeUI.bind(this));
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChangeUI.bind(this));
  }

  onChangeUI(state) {
    let element = state[this.state.type];
    this.setState({
      checked: element.checkedAll
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
      <input type="checkbox" onChange={this.toggleCheckbox.bind(this)} checked={this.state.checked}/>
    )
  }
}
