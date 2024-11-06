import React from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import UIActions from 'src/stores/alt/actions/UIActions';

export default class ElementCheckbox extends React.Component {
  constructor(props) {
    super(props);

    this.toggleCheckbox = this.toggleCheckbox.bind(this);
  }

  toggleCheckbox() {
    const { checked, element } = this.props;

    if (!checked) {
      UIActions.checkElement(element);
    } else {
      UIActions.uncheckElement(element);
    }
  }

  render() {
    const { checked } = this.props;
    return (
      <Form.Check
        onChange={this.toggleCheckbox}
        checked={checked}
        className="element-checkbox"
      />
    );
  }
}

ElementCheckbox.propTypes = {
  element: PropTypes.any.isRequired,
  checked: PropTypes.bool.isRequired,
};
