import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { Form, FormGroup, Button, InputGroup, Glyphicon, ControlLabel, Checkbox,
         FormControl, Tooltip, OverlayTrigger } from 'react-bootstrap';
import Select, { components } from 'react-select3';
import OlsTreeSelect from './OlsComponent';

import Reaction from './models/Reaction';
import { permitOn } from './common/uis';
import { statusOptions, rolesOptions } from './staticDropdownOptions/options';


const ReactionNameInput = ({reaction, inline, onChange }) => {
  const disabled = !permitOn(reaction) || reaction.isMethodDisabled('name')

  return (
    <FormGroup>
      {!inline && <ControlLabel>Name</ControlLabel>}
      <FormControl
        id={inline ? `reaction_name_${reaction.id}` : 'reaction_name' }
        type="text"
        value={reaction.name || ''}
        placeholder="Name..."
        onChange={event => onChange('name', event.target.value)}
        disabled={disabled}
        readOnly={disabled}
      />
    </FormGroup>
  )
}

ReactionNameInput.propTypes = {
  reaction: PropTypes.object,
  inline: PropTypes.bool,
  onChange: PropTypes.func
}

const ReactionStatusInput = ({reaction, inline, onChange }) => {
  const value = statusOptions.find(el => el.value == reaction.status)

  return (
    <FormGroup>
      {!inline && <ControlLabel>Status</ControlLabel>}
      <Select
        id={inline ? `reaction_name_${reaction.id}` : 'reaction_name' }
        name="status"
        options={statusOptions}
        isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('status')}
        onChange={option => onChange('status', option.value)}
        value={value}
        menuPortalTarget={inline ? document.body : null}
      />
    </FormGroup>
  )
}

ReactionStatusInput.propTypes = {
  reaction: PropTypes.object,
  inline: PropTypes.bool,
  onChange: PropTypes.func
}

class ReactionTemperatureInput extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showTemperatureChart: false,
      temperature: false,
      temperatureUnit: props.reaction.temperature ? props.reaction.temperature.valueUnit : '°C'
    }

    this.toggleTemperatureChart = this.toggleTemperatureChart.bind(this)
    this.handleTemperatureChange = this.handleTemperatureChange.bind(this)
    this.handleTemperatureUnitChange = this.handleTemperatureUnitChange.bind(this)
  }

  toggleTemperatureChart() {
    const { showTemperatureChart } = this.state
    this.setState({ showTemperatureChart: !showTemperatureChart });
  }

  handleTemperatureChange(event) {
    const { reaction, onChange } = this.props
    const value = event.target.value
    const temperature = Object.assign({}, reaction.temperature, {
      userText: value
    })
    onChange('temperature', temperature)
  }

  handleTemperatureUnitChange() {
    const { reaction, onChange } = this.props
    const { temperatureUnit } = this.state
    const index = Reaction.temperature_unit.indexOf(temperatureUnit);
    const newUnit = Reaction.temperature_unit[(index + 1) % 3];
    this.setState({ temperatureUnit: newUnit })
    const temperature = reaction.convertTemperature(newUnit);
    onChange('temperature', temperature)
  }

  render() {
    const { reaction, inline, onChange } = this.props
    const { showTemperatureChart, temperature, temperatureUnit } = this.state

    const temperatureTooltip = (
      <Tooltip id="show_temperature">Show temperature chart</Tooltip>
    )

    const temperatureDisplay = (reaction.temperature !== null) ? reaction.temperature_display : null

    return (
      <FormGroup>
        {!inline && <ControlLabel>Temperature</ControlLabel>}
        <InputGroup>
          {!inline && <InputGroup.Button>
              <OverlayTrigger placement="bottom" overlay={temperatureTooltip}>
                <Button
                  disabled={!permitOn(reaction)}
                  active
                  className="clipboardBtn"
                  onClick={this.toggleTemperatureChart}
                >
                  <i className="fa fa-area-chart" />
                </Button>
              </OverlayTrigger>
            </InputGroup.Button>
          }
          <FormControl
            type="text"
            value={temperatureDisplay || ''}
            disabled={!permitOn(reaction) || reaction.isMethodDisabled('temperature')}
            placeholder="Temperature..."
            onChange={this.handleTemperatureChange}
          />
          <InputGroup.Button>
            <Button
              disabled={!permitOn(reaction)}
              bsStyle="success"
              onClick={this.handleTemperatureUnitChange}
            >
              {temperatureUnit}
            </Button>
          </InputGroup.Button>
        </InputGroup>
      </FormGroup>
    )
  }
}

ReactionStatusInput.propTypes = {
  reaction: PropTypes.object,
  inline: PropTypes.bool,
  onChange: PropTypes.func
}

const ReactionTypeInput = ({reaction, inline, onChange }) => {
  return (
    <FormGroup>
      {!inline && <ControlLabel>Type (Name Reaction Ontology)</ControlLabel>}
      <OlsTreeSelect
        selectName="rxno"
        selectedValue={(reaction.rxno && reaction.rxno.trim()) || ''}
        onSelectChange={event => onChange('rxno', event.trim())}
        selectedDisable={!permitOn(reaction) || reaction.isMethodDisabled('rxno')}
      />
    </FormGroup>
  )
}

ReactionTypeInput.propTypes = {
  reaction: PropTypes.object,
  inline: PropTypes.bool,
  onChange: PropTypes.func
}

class ReactionRoleInput extends Component {

  constructor(props) {
    super(props);
    this.state = {}
    this.handleRoleChange = this.handleRoleChange.bind(this)
  }

  handleRoleChange(option) {
    const { reaction, onChange } = this.props
    const role = (option !== null) ? option.value : null
    const name = (option !== null) ? reaction.nameFromRole(option.value) : reaction.name
    onChange('role', role, name)
  }

  render() {
    const { reaction, inline } = this.props
    const value = rolesOptions.find(el => el.value == reaction.role)

    const { Option } = components
    const RoleOption = props => (
      <Option {...props}>
        <i className={`fa ${props.data.icon} ${props.data.bsStyle}`} />
        <span className="spacer-10" />
        {props.data.label}
      </Option>
    )

    return (
      <FormGroup>
        {!inline && <ControlLabel>Type (Name Reaction Ontology)</ControlLabel>}
        <Select
          id={inline ? `reaction_role_${reaction.id}` : 'reaction_role' }
          name="role"
          options={rolesOptions}
          isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('role')}
          onChange={this.handleRoleChange}
          value={value}
          components={{ Option: RoleOption }}
          menuPortalTarget={inline ? document.body : null}
        />
      </FormGroup>
    )
  }
}

ReactionRoleInput.propTypes = {
  reaction: PropTypes.object,
  inline: PropTypes.bool,
  onChange: PropTypes.func
}


export { ReactionNameInput, ReactionStatusInput, ReactionTemperatureInput, ReactionTypeInput,
         ReactionRoleInput }
