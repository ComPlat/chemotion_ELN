import React, {Component} from 'react';
import {Row, Col, FormGroup, FormControl, ControlLabel, ListGroupItem,
        OverlayTrigger, ListGroup, Button, Tooltip, InputGroup} from 'react-bootstrap'
import Select from 'react-select'

import Reaction from './models/Reaction';

import {solventOptions, statusOptions} from './staticDropdownOptions/options'

import NumeralInputWithUnitsCompo from './NumeralInputWithUnitsCompo';
import LineChartContainer from './lineChart/LineChartContainer'
import EditableTable from './lineChart/EditableTable'
import QuillEditor from './QuillEditor'

import {reactionToolbarSymbol} from './utils/quillToolbarSymbol';

export default class ReactionDetailsMainProperties extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showTemperatureChart: false,
      temperature: props.reaction.temperature
    }

    this.toggleTemperatureChart = this.toggleTemperatureChart.bind(this)
    this.updateTemperature = this.updateTemperature.bind(this)

    this.temperatureUnit = props.reaction.temperature.valueUnit
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      temperature: nextProps.reaction.temperature
    })

    this.temperatureUnit = nextProps.reaction.temperature.valueUnit
  }

  updateTemperature(newData) {
    let {temperature} = this.state
    temperature.data = newData

    this.setState({temperature: temperature})

    this.props.onInputChange('temperatureData', temperature)
  }

  toggleTemperatureChart() {
    let {showTemperatureChart} = this.state
    this.setState({ showTemperatureChart: !showTemperatureChart })
  }

  changeUnit() {
    let index = Reaction.temperature_unit.indexOf(this.temperatureUnit)
    let unit = Reaction.temperature_unit[(index + 1) % 3]

    this.props.onInputChange('temperatureUnit', unit)
  }

  render() {
    const {reaction, onInputChange} = this.props
    let temperatureTooltip = (
      <Tooltip id="show_temperature">Show temperature chart</Tooltip>
    )

    let temperatureDisplay = reaction.temperature_display
    let {showTemperatureChart, temperature} = this.state
    let tempUnitLabel = "Temperature (" + this.temperatureUnit + ")"

    let TempChartRow = <span />
    if (showTemperatureChart) {
      TempChartRow = (
        <div>
          <div style={{width: "74%", float: "left"}}>
            <LineChartContainer data={temperature} xAxis="Time" yAxis={tempUnitLabel}/>
          </div>
          <div style={{width: "25%", float: "left"}}>
            <EditableTable temperature={temperature}
              updateTemperature={this.updateTemperature}/>
          </div>
        </div>
      )
    }

    return (
      <ListGroup>
        <ListGroupItem header="">
          <Row>
            <Col md={6}>
              <FormGroup>
                <ControlLabel>Name</ControlLabel>
                <FormControl
                  type="text"
                  value={reaction.name || ''}
                  placeholder="Name..."
                  disabled={reaction.isMethodDisabled('name')}
                  onChange={event => onInputChange('name', event)}/>
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <ControlLabel>Status</ControlLabel>
                <Select
                  name='status'
                  multi={false}
                  options={statusOptions}
                  value={reaction.status}
                  disabled={reaction.isMethodDisabled('status')}
                  onChange={event => {
                    const wrappedEvent = {target: {value: event}};
                    onInputChange('status', wrappedEvent)
                  }}
                />
              </FormGroup>
            </Col>
            <Col md={3}>
              <FormGroup>
                <ControlLabel>Temperature</ControlLabel>
                <InputGroup>
                  <InputGroup.Button>
                    <OverlayTrigger placement="bottom" overlay={temperatureTooltip}>
                      <Button active className="clipboardBtn"
                              onClick={this.toggleTemperatureChart}>
                        <i className="fa fa-area-chart"></i>
                      </Button>
                    </OverlayTrigger>
                  </InputGroup.Button>
                  <FormControl
                    type="text"
                    value={temperatureDisplay || ''}
                    disabled={reaction.isMethodDisabled('temperature')}
                    placeholder="Temperature..."
                    onChange={event => onInputChange('temperature', event)} />
                  <InputGroup.Button>
                    <Button bsStyle="success"
                            onClick={() => this.changeUnit()}>
                      {this.temperatureUnit}
                    </Button>
                  </InputGroup.Button>
                </InputGroup>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            {TempChartRow}
          </Row>
          <Row>
            <Col md={12}>
              <FormGroup>
                <ControlLabel>Description</ControlLabel>
                <QuillEditor value={reaction.description}
                  onChange={event => onInputChange('description', event)}
                  toolbarSymbol={reactionToolbarSymbol}/>
              </FormGroup>
            </Col>
          </Row>
        </ListGroupItem>
      </ListGroup>
    )
  }
}

ReactionDetailsMainProperties.propTypes = {
  reaction: React.PropTypes.object,
  onInputChange: React.PropTypes.func
}
