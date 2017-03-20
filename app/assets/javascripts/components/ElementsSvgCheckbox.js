import React, {Component} from 'react';
import {FormGroup,Checkbox, Label} from 'react-bootstrap';
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
    return(
      <FormGroup>
        <Checkbox //className="element-svg-checkbox"
          onChange={() => this.toggleCheckbox()}
          checked={this.state.checked ? this.state.checked : false}
        >
          <Label style={{fontSize: '100%'}}>Schemes</Label>
        </Checkbox>
      </FormGroup>
    )
  }
}
