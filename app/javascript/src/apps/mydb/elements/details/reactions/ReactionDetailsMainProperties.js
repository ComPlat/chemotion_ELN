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
import Reaction from 'src/models/Reaction';
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
    const { reaction: { temperature }, onInputChange } = this.props;
    onInputChange('temperatureData', { ...temperature, data: newData });
  }

  toggleTemperatureChart() {
    const { showTemperatureChart } = this.state;
    this.setState({ showTemperatureChart: !showTemperatureChart });
  }

  changeUnit() {
    const { reaction: { temperature }, onInputChange } = this.props;

    const units = Reaction.temperature_unit;
    const index = units.indexOf(temperature.valueUnit);
    const unit = units[(index + 1) % units.length];
    onInputChange('temperatureUnit', unit);
  }

  render() {
    const {
      reaction,
      onInputChange,
      leadingField,
      leadingFieldColSize,
      temperatureColSize,
      showSchemeFields,
      phField,
      vesselSizeField,
      durationField,
      reactionVolumeField,
    } = this.props;
    const { temperature } = reaction;
    const { showTemperatureChart } = this.state;
    const rowClassName = showSchemeFields ? 'mt-3 mb-0' : 'my-3';

    return (
      <>
        <Row className={rowClassName}>
          {leadingField && (
            <Col sm={leadingFieldColSize}>
              {leadingField}
            </Col>
          )}
          <Col sm={temperatureColSize}>
            <Form.Group>
              <Form.Label>Temperature</Form.Label>
              <InputGroup>
                <OverlayTrigger
                  placement="bottom"
                  overlay={(
                    <Tooltip id="show_temperature">Show temperature chart</Tooltip>
                  )}
                >
                  <Button
                    disabled={!permitOn(reaction)}
                    className="clipboardBtn"
                    onClick={this.toggleTemperatureChart}
                    variant="light"
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
          {showSchemeFields && (
            <>
              <Col sm={3}>
                {phField}
              </Col>
              <Col sm={3}>
                {durationField || vesselSizeField}
              </Col>
              <Col sm={3}>
                {reactionVolumeField}
              </Col>
            </>
          )}
        </Row>

        {showTemperatureChart && (
          <Row className="mb-2">
            <Col>
              <LineChartContainer
                data={temperature}
                xAxis="Time (h)"
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
  onInputChange: PropTypes.func,
  leadingField: PropTypes.node,
  leadingFieldColSize: PropTypes.number,
  temperatureColSize: PropTypes.number,
  showSchemeFields: PropTypes.bool,
  phField: PropTypes.node,
  vesselSizeField: PropTypes.node,
  durationField: PropTypes.node,
  reactionVolumeField: PropTypes.node,
};

ReactionDetailsMainProperties.defaultProps = {
  reaction: {},
  onInputChange: () => {},
  leadingField: null,
  leadingFieldColSize: 9,
  temperatureColSize: 3,
  showSchemeFields: false,
  phField: null,
  vesselSizeField: null,
  durationField: null,
  reactionVolumeField: null,
};
