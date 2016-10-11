import React, {Component} from 'react';
import {Row, Col, FormGroup, FormControl, ControlLabel, ListGroupItem,
        OverlayTrigger, ListGroup, Button, Tooltip, InputGroup} from 'react-bootstrap'
import Select from 'react-select'
import {solventOptions} from './staticDropdownOptions/options'
import LineChartContainer from './lineChart/LineChartContainer'
import EditableTable from './lineChart/EditableTable'

export default class ReactionDetailsMainProperties extends Component {
  constructor(props) {
    super(props)
    this.state = {
      showTemperatureChart: false,
      temperatureData: props.reaction.temperature,
      temperatureDisplay: props.reaction.temperature_display
    }

    this.toggleTemperatureChart = this.toggleTemperatureChart.bind(this)
    this.updateTemperatureData = this.updateTemperatureData.bind(this)
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      temperatureData: nextProps.reaction.temperature,
      temperatureDisplay: nextProps.reaction.temperature_display
    })
  }

  updateTemperatureData(newData) {
    let {temperatureData} = this.state
    temperatureData.data = newData

    this.setState({temperatureData: temperatureData})
  }

  toggleTemperatureChart() {
    let {showTemperatureChart} = this.state
    this.setState({ showTemperatureChart: !showTemperatureChart })
  }

  render() {
    const {reaction, onInputChange} = this.props
    let temperatureTooltip = (
      <Tooltip id="show_temperature">Show temperature chart</Tooltip>
    )

    let {showTemperatureChart, temperatureData, temperatureDisplay} = this.state
    let TempChartRow = ''
    if (showTemperatureChart) {
      TempChartRow = (
        <div>
          <div style={{width: "75%", float: "left"}}>
            <LineChartContainer data={temperatureData} xAxis="Time" yAxis="Temperature"/>
          </div>
          <div style={{width: "23%", float: "left"}}>
            <EditableTable data={temperatureData.data}
              updateData={this.updateTemperatureData}/>
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
            <Col md={6}>
              <FormGroup>
                <ControlLabel>Temperature</ControlLabel>
                <InputGroup>
                <FormControl
                  type="text"
                  value={temperatureDisplay || ''}
                  disabled={reaction.isMethodDisabled('temperature')}
                  placeholder="Temperature..."
                  onChange={event => onInputChange('temperature', event)}/>
                <InputGroup.Button>
                  <OverlayTrigger placement="bottom" overlay={temperatureTooltip}>
                    <Button active className="clipboardBtn"
                            onClick={this.toggleTemperatureChart}
                            data-clipboard-text={temperatureDisplay || " "} >
                      <i className="fa fa-area-chart"></i>
                    </Button>
                  </OverlayTrigger>
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
                <FormControl
                  componentClass="textarea"
                  value={reaction.description || ''}
                  disabled={reaction.isMethodDisabled('description')}
                  placeholder="Description..."
                  onChange={event => onInputChange('description', event)}/>
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
