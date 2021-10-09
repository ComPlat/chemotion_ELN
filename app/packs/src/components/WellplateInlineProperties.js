import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, FormGroup, FormControl } from 'react-bootstrap';

import ElementActions from './actions/ElementActions'

export default class WellplateInlineProperties extends Component {

  constructor(props) {
    super(props);
    this.handleInputChange = this.handleInputChange.bind(this)
  }

  handleInputChange(type, event) {
    const { wellplate } = this.props;
    const value = event.target.value;

    ElementActions.changeElementProperty(wellplate, type, value)
  }

  renderButtons() {
    const { wellplate, onSave } = this.props;

    return (
      <FormGroup>
        <Button bsSize="xsmall" bsStyle="warning"
          onClick={(event) => onSave(event, [wellplate], wellplate.type)}>
          <i className="fa fa-floppy-o" />
        </Button>
      </FormGroup>
    )
  }

  render() {
    const { wellplate, showDetails } = this.props
    const { name } = wellplate

    return (
      <tr>
        <td style={{ cursor: 'pointer' }} onClick={() => showDetails(wellplate)}>
          {wellplate.isNew ? <i>{wellplate.title()}</i> : wellplate.title()}
        </td>
        <td>
          <FormGroup>
            <FormControl type="text"
              value={name || ''}
              onChange={event => this.handleInputChange('name', event)}
              disabled={name == '***'}
            />
          </FormGroup>
        </td>
        <td>
          {/* placeholder */}
        </td>
        <td>
          {this.renderButtons()}
        </td>
      </tr>
    )
  }
}

WellplateInlineProperties.propTypes = {
  wellplate: PropTypes.object,
  onSave: PropTypes.func,
  showDetails: PropTypes.func
};
