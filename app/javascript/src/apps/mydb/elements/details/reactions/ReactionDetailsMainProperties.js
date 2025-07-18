import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Col,
  OverlayTrigger,
  Button,
  Tooltip,
  InputGroup,
  Row,
  Form
} from 'react-bootstrap';
import { Select } from 'src/components/common/Select';
import uuid from 'uuid';
import Reaction from 'src/models/Reaction';
import { statusOptions } from 'src/components/staticDropdownOptions/options';
import LineChartContainer from 'src/components/lineChart/LineChartContainer';
import EditableTable from 'src/components/lineChart/EditableTable';
import { permitOn } from 'src/components/common/uis';

export default class ReactionDetailsMainProperties extends Component {
  constructor(props) {
    super(props);

    this.state = {
      showTemperatureChart: false,
    };

    this.toggleTemperatureChart = this.toggleTemperatureChart.bind(this);
    this.updateTemperature = this.updateTemperature.bind(this);
  }

  updateTemperature(newData) {
    const { reaction: { temperature } } = this.props;
    this.props.onInputChange('temperatureData', { ...temperature, data: newData });
  }

  toggleTemperatureChart() {
    const { showTemperatureChart } = this.state;
    this.setState({ showTemperatureChart: !showTemperatureChart });
  }

  changeUnit() {
    const { reaction: { temperature } } = this.props;

    const units = Reaction.temperature_unit;
    const index = units.indexOf(temperature.valueUnit);
    const unit = units[(index + 1) % units.length];
    this.props.onInputChange('temperatureUnit', unit);
  }

  render() {
    const { reaction, onInputChange } = this.props;
    const { temperature } = reaction;
    const { showTemperatureChart } = this.state;

    return (
      <>
        <Row className="my-3">
          <Col sm={6}>
            <Form.Group>
              <Form.Label>Name</Form.Label>
              <Form.Control
                id={uuid.v4()}
                name="reaction_name"
                type="text"
                value={reaction.name || ''}
                placeholder="Name..."
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('name')}
                onChange={(event) => onInputChange('name', event)}
              />
            </Form.Group>
          </Col>
          <Col sm={3}>
            <Form.Group>
              <Form.Label>Status</Form.Label>
              <Select
                name="status"
                isClearable
                options={statusOptions}
                value={statusOptions.find(({value}) => value === reaction.status)}
                isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('status')}
                onChange={(option) => {
                  const wrappedEvent = {target: {value: option?.value || null}};
                  onInputChange('status', wrappedEvent);
                }}
              />
            </Form.Group>
          </Col>
          <Col sm={3}>
            <Form.Group>
              <Form.Label>Temperature</Form.Label>
              <InputGroup>
                <OverlayTrigger placement="bottom" overlay={(
                  <Tooltip id="show_temperature">Show temperature chart</Tooltip>
                )}>
                  <Button
                    disabled={!permitOn(reaction)}
                    active
                    className="clipboardBtn"
                    onClick={this.toggleTemperatureChart}
                    variant="secondary"
                  >
                    <i className="fa fa-area-chart" />
                  </Button>
                </OverlayTrigger>
                <Form.Control
                  type="text"
                  value={reaction.temperature_display || ''}
                  disabled={!permitOn(reaction) || reaction.isMethodDisabled('temperature')}
                  placeholder="Temperature..."
                  onChange={(event) => onInputChange('temperature', event)}
                />
                <Button
                  disabled={!permitOn(reaction)}
                  variant="primary"
                  onClick={() => this.changeUnit()}
                >
                  {temperature.valueUnit}
                </Button>
              </InputGroup>
            </Form.Group>
          </Col>
        </Row>

        {showTemperatureChart && (
          <Row className="mb-2">
            <Col>
              <LineChartContainer
                data={temperature}
                xAxis="Time"
                yAxis={`Temperature (${temperature.valueUnit})`}
              />
            </Col>
            <Col>
              <EditableTable
                temperature={temperature}
                updateTemperature={this.updateTemperature}
              />
            </Col>
          </Row>
        )}
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
