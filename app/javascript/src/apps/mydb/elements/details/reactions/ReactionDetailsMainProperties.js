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
import {
  findVariationRange, variationRangeText
} from 'src/apps/mydb/elements/details/reactions/schemeTab/VariationRangeUtils';

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
      variations,
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
    /*
    A temperature the variations do not agree on is shown as their range and cannot be edited here.
    `temperature_display` is free text - it holds things like "reflux" as readily as a number - so
    only the variations that put a number in it take part in the range; if none of them do, the
    field stays as editable as it was.
    */
    const temperatureRange = findVariationRange(
      variations,
      (variationReaction) => parseFloat(variationReaction.temperature_display),
      parseFloat(reaction.temperature_display),
    );
    const isTemperatureDisabled = !permitOn(reaction)
      || reaction.isMethodDisabled('temperature')
      || temperatureRange.isRangeField;

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
                    onClick={this.toggleTemperatureChart}
                    variant="light"
                  >
                    <i className="fa fa-area-chart" />
                  </Button>
                </OverlayTrigger>
                <Form.Control
                  type="text"
                  value={
                    temperatureRange.isRangeField
                      ? variationRangeText(temperatureRange)
                      : (reaction.temperature_display || '')
                  }
                  disabled={isTemperatureDisabled}
                  placeholder="Temperature..."
                  onChange={(event) => onInputChange('temperature', event)}
                />
                <Button
                  disabled={!permitOn(reaction) || temperatureRange.isRangeField}
                  variant="light"
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
  // Only the scheme tab has variations; the properties tab renders the same fields without them.
  variations: PropTypes.arrayOf(PropTypes.shape({
    data: PropTypes.instanceOf(Reaction).isRequired,
  })),
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
  variations: [],
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
