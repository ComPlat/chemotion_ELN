import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Col,
  OverlayTrigger,
  Button,
  Tooltip,
  InputGroup,
  Row,
  Container,
  Form
} from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import Reaction from 'src/models/Reaction';
import { statusOptions } from 'src/components/staticDropdownOptions/options';
import LineChartContainer from 'src/components/lineChart/LineChartContainer';
import EditableTable from 'src/components/lineChart/EditableTable';
import { permitOn } from 'src/components/common/uis';

export default class ReactionDetailsMainProperties extends Component {
  constructor(props) {
    super(props);
    const { temperature } = props && props.reaction;
    this.state = {
      showTemperatureChart: false,
      temperature,
    };
    this.toggleTemperatureChart = this.toggleTemperatureChart.bind(this);
    this.updateTemperature = this.updateTemperature.bind(this);
    this.temperatureUnit = props.reaction.temperature.valueUnit;
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      temperature: nextProps.reaction.temperature,
    });

    this.temperatureUnit = nextProps.reaction.temperature.valueUnit;
  }

  updateTemperature(newData) {
    const { temperature } = this.state;
    temperature.data = newData;
    this.setState({ temperature });
    this.props.onInputChange('temperatureData', temperature);
  }

  toggleTemperatureChart() {
    const { showTemperatureChart } = this.state;
    this.setState({ showTemperatureChart: !showTemperatureChart });
  }

  changeUnit() {
    const index = Reaction.temperature_unit.indexOf(this.temperatureUnit);
    const unit = Reaction.temperature_unit[(index + 1) % 3];
    this.props.onInputChange('temperatureUnit', unit);
  }

  render() {
    const { reaction, onInputChange } = this.props;
    const temperatureTooltip = (
      <Tooltip id="show_temperature">Show temperature chart</Tooltip>
    );

    const temperatureDisplay = reaction.temperature_display;
    const { showTemperatureChart, temperature } = this.state;
    const tempUnitLabel = `Temperature (${this.temperatureUnit})`;

    let TempChartRow = <span />;
    if (showTemperatureChart) {
      TempChartRow = (
        <Col md={12}>
          <div className='w-75 float-start mt-4'>
            <LineChartContainer
              data={temperature}
              xAxis="Time"
              yAxis={tempUnitLabel}
            />
          </div>
          <div className='w-25 float-start mt-4'>
            <EditableTable
              temperature={temperature}
              updateTemperature={this.updateTemperature}
            />
          </div>
        </Col>
      );
    }

    return (
      <>
        <Row className=' ms-1 me-3'>
          <Col md={6}>
            <Form.Group>
              <Form.Label className='fs-5'>Name</Form.Label>
              <Form.Control
                id={uuid.v4()}
                name="reaction_name"
                type="text"
                value={reaction.name || ''}
                placeholder="Name..."
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('name')}
                onChange={event => onInputChange('name', event)}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className='fs-5'>Status</Form.Label>
              <Select
                className="status-select reaction-status-change"
                name="status"
                key={reaction.status}
                multi={false}
                options={statusOptions}
                value={reaction.status}
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('status')}
                onChange={(event) => {
                  const wrappedEvent = {
                    target: { value: event && event.value },
                  };
                  onInputChange('status', wrappedEvent);
                }}
              />
            </Form.Group>
          </Col>
          <Col md={3}>
            <Form.Group>
              <Form.Label className='fs-5'>Temperature</Form.Label>
              <InputGroup>
                <OverlayTrigger placement="bottom" overlay={temperatureTooltip}>
                  <Button
                    disabled={!permitOn(reaction)}
                    active
                    className="clipboardBtn"
                    onClick={this.toggleTemperatureChart}
                    variant='secondary'
                  >
                    <i className="fa fa-area-chart" />
                  </Button>
                </OverlayTrigger>
                <Form.Control
                  type="text"
                  value={temperatureDisplay || ''}
                  disabled={!permitOn(reaction) || reaction.isMethodDisabled('temperature')}
                  placeholder="Temperature..."
                  onChange={event => onInputChange('temperature', event)}
                />
                <Button
                  disabled={!permitOn(reaction)}
                  variant="success"
                  onClick={() => this.changeUnit()}
                >
                  {this.temperatureUnit}
                </Button>
              </InputGroup>
            </Form.Group>
          </Col>
        </Row>
        <Row>
          {TempChartRow}
        </Row>
      </>
    );
  }
}

ReactionDetailsMainProperties.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  reaction: PropTypes.object,
  onInputChange: PropTypes.func
};

ReactionDetailsMainProperties.defaultProps = {
  reaction: {},
  onInputChange: () => {}
};
