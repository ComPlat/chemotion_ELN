import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormGroup, FormControl, ControlLabel, OverlayTrigger, Button, InputGroup, Tooltip } from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';

import { permitOn } from './common/uis';
import { setReactionByType } from './ReactionDetailsShare';
import { rfValueFormat } from './utils/ElementUtils';
import { statusOptions } from './staticDropdownOptions/options';

import ElementActions from './actions/ElementActions'
import ReactionDetailsDuration from './ReactionDetailsDuration'
import { ReactionNameInput, ReactionStatusInput, ReactionTemperatureInput,
         ReactionTypeInput, ReactionRoleInput } from './ReactionInput'


export default class ReactionInlineProperties extends Component {

  constructor(props) {
    super(props);
    this.handleInputChange = this.handleInputChange.bind(this)
  }

  handleInputChange(type, event) {
    const { reaction } = this.props;
    const value = event.target.value;

    ElementActions.changeElementProperty(reaction, type, value)
  }

  renderButtons() {
    const { reaction, onCopy, onSave } = this.props

    return (
      <FormGroup>
        {!reaction.isNew && <Button bsSize="xsmall" bsStyle="success" style={{marginRight: 5}}
          onClick={(event) => onCopy(event, reaction)}>
          <i className="fa fa-clone" />
        </Button>}
        <Button bsSize="xsmall" bsStyle="warning"
          disabled={!permitOn(reaction)}
          onClick={(event) => onSave(event, [reaction], reaction.type)}>
          <i className="fa fa-floppy-o" />
        </Button>
      </FormGroup>
    )
  }

  render() {
    const { reaction, showDetails } = this.props

    const onChange = (field, value) => ElementActions.changeElementProperty(reaction, field, value)
    const onRoleChange = (field, role, name) => ElementActions.changeElementProperties(reaction, { role, name })
    const onDurationChange = (field, event) => {
      if (field == 'timestampStart') {
        ElementActions.changeElementProperty(reaction, 'timestamp_start', event.target.value)
      } else if (field == 'timestampStop') {
        ElementActions.changeElementProperty(reaction, 'timestamp_stop', event.target.value)
      } else if (field == 'duration') {
        ElementActions.changeElementProperty(reaction, 'durationDisplay', event)
      }
    }

    return (
      <tr>
        <td style={{ cursor: 'pointer' }} onClick={() => showDetails(reaction)}>
          {reaction.isNew ? <i>{reaction.title()}</i> : reaction.title()}
        </td>
        <td>
          <ReactionNameInput reaction={reaction} inline={true} onChange={onChange} />
        </td>
        <td>
          <ReactionStatusInput reaction={reaction} inline={true} onChange={onChange} />
        </td>
        <td>
          <ReactionTemperatureInput reaction={reaction} inline={true} onChange={onChange} />
        </td>
        <td>
          <ReactionDetailsDuration reaction={reaction} inline={true} onInputChange={onDurationChange} />
        </td>
        <td>
          <ReactionTypeInput reaction={reaction} inline={true} onChange={onChange} />
        </td>
        <td>
          <ReactionRoleInput reaction={reaction} inline={true} onChange={onRoleChange} />
        </td>
        <td>
          {this.renderButtons()}
        </td>
      </tr>
    )
  }
}

ReactionInlineProperties.propTypes = {
  reaction: PropTypes.object,
  onSave: PropTypes.func,
  showDetails: PropTypes.func
};
