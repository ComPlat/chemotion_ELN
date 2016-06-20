import React, {Component} from 'react';
import {Input} from 'react-bootstrap';
import UIActions from './actions/UIActions';

export default class ElementsSvgCheckbox extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: props.checked ? props.checked : false
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      checked: nextProps.checked
    })
  }


  toggleCheckbox() {
    const {checked} = this.state;
    UIActions.toggleShowPreviews();
    this.setState({checked: !checked});
  }

  render() {
    return <Input label="Show Previews" type="checkbox"
      onChange={() => this.toggleCheckbox()}
      checked={this.state.checked ? this.state.checked : false}/>
  }
}
