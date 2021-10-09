import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, FormGroup, FormControl } from 'react-bootstrap';

import ElementActions from './actions/ElementActions'

export default class ScreenInlineProperties extends Component {

  constructor(props) {
    super(props);
    this.handleInputChange = this.handleInputChange.bind(this)
  }

  handleInputChange(type, event) {
    const { screen } = this.props;
    const value = event.target.value;

    ElementActions.changeElementProperty(screen, type, value)
  }

  renderButtons() {
    const { screen, onSave } = this.props;

    return (
      <FormGroup>
        <Button bsSize="xsmall" bsStyle="warning"
          onClick={(event) => onSave(event, [screen], screen.type)}>
          <i className="fa fa-floppy-o" />
        </Button>
      </FormGroup>
    )
  }

  render() {
    const { screen, showDetails } = this.props
    const { name, collaborator, result, conditions, requirements } = screen;

    return (
      <tr>
        <td style={{ cursor: 'pointer' }} onClick={() => showDetails(screen)}>
          {screen.isNew ? <i>{screen.title()}</i> : screen.title()}
        </td>
        <td>
          <FormGroup>
            <FormControl
              type="text"
              value={name || ''}
              onChange={event => this.handleInputChange('name', event)}
              disabled={screen.isMethodDisabled('name')}
            />
          </FormGroup>
        </td>
        <td>
          <FormGroup>
            <FormControl
              type="text"
              value={collaborator || ''}
              onChange={event => this.handleInputChange('collaborator', event)}
              disabled={screen.isMethodDisabled('collaborator')}
            />
          </FormGroup>
        </td>
        <td>
          <FormGroup>
            <FormControl
              type="text"
              value={requirements || ''}
              onChange={event => this.handleInputChange('requirements', event)}
              disabled={screen.isMethodDisabled('requirements')}
            />
          </FormGroup>
        </td>
        <td >
          <FormGroup>
            <FormControl
              type="text"
              value={conditions || ''}
              onChange={event => this.handleInputChange('conditions', event)}
              disabled={screen.isMethodDisabled('conditions')}
            />
          </FormGroup>
        </td>
        <td>
          <FormGroup>
            <FormControl
              type="text"
              value={result || ''}
              onChange={event => this.handleInputChange('result', event)}
              disabled={screen.isMethodDisabled('result')}
            />
          </FormGroup>
        </td>
        <td>
          {this.renderButtons()}
        </td>
      </tr>
    )
  }
}

ScreenInlineProperties.propTypes = {
  screen: PropTypes.object,
  onSave: PropTypes.func,
  showDetails: PropTypes.func
};
