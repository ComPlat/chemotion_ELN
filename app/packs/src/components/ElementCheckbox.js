import React from 'react';
import UIActions from './actions/UIActions';

export default class ElementCheckbox extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: false,
      element: props.element
    }
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { element, checked } = nextProps;
    this.setState({
      element,
      checked
    });
  }

  updateCheckedStatus(element, state) {
    let checked = this.isChecked(element, state);
    this.setState({checked: checked});
  }

  toggleCheckbox() {
    let newChecked = !this.props.checked;

    if(newChecked) {
      UIActions.checkElement(this.state.element);
    } else {
      UIActions.uncheckElement(this.state.element);
    }
  }

  render() {
    return (
      <input
        type="checkbox"
        onChange={this.toggleCheckbox.bind(this)}
        checked={this.props.checked}
        className="element-checkbox"
      />
    );
  }
}
