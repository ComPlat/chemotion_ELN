import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  Col,
  FormGroup,
  FormControl,
  ControlLabel,
  OverlayTrigger,
  Button,
  Tooltip,
  InputGroup,
  Grid,
  Row
} from 'react-bootstrap';
import Select from 'react-select';
import uuid from 'uuid';
import Reaction from 'src/models/Reaction';
import { statusOptions } from 'src/components/staticDropdownOptions/options';
import LineChartContainer from 'src/components/lineChart/LineChartContainer';
import EditableTable from 'src/components/lineChart/EditableTable';
import { permitOn } from 'src/components/common/uis';
import GaseousReactionActions from 'src/stores/alt/actions/GaseousReactionActions';

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
    this.reactionVesselSize = this.reactionVesselSize.bind(this);
    this.updateVesselSize = this.updateVesselSize.bind(this);
    this.changeVesselSizeUnit = this.changeVesselSizeUnit.bind(this);
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

  updateVesselSize(e) {
    const { onInputChange } = this.props;
    const { value } = e.target;
    GaseousReactionActions.setReactionVesselSize(value);
    onInputChange('vesselSizeAmount', value);
  }

  changeVesselSizeUnit() {
    const { onInputChange, reaction } = this.props;
    if (reaction.vessel_size.unit === 'ml') {
      onInputChange('vesselSizeUnit', 'l');
    } else if (reaction.vessel_size.unit === 'l') {
      onInputChange('vesselSizeUnit', 'ml');
    }
  }

  reactionVesselSize() {
    const { reaction } = this.props;
    return (
      <Col md={2}>
        <InputGroup style={{ paddingTop: '2px', paddingLeft: '6px', paddingRight: '45px' }}>
          <ControlLabel>Vessel size</ControlLabel>
          <FormGroup style={{ display: 'flex' }}>
            <FormControl
              id="reactionVesselSize"
              name="reaction_vessel_size"
              type="text"
              value={reaction.vessel_size?.amount || ''}
              disabled={false}
              onChange={(event) => this.updateVesselSize(event)}
            />
            <InputGroup.Button>
              <Button
                disabled={false}
                bsStyle="success"
                onClick={() => this.changeVesselSizeUnit()}
              >
                {reaction.vessel_size?.unit || 'ml'}
              </Button>
            </InputGroup.Button>
          </FormGroup>
        </InputGroup>
      </Col>
    );
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
          <div style={{ width: '74%', float: 'left' }}>
            <LineChartContainer
              data={temperature}
              xAxis="Time"
              yAxis={tempUnitLabel}
            />
          </div>
          <div style={{ width: '25%', float: 'left' }}>
            <EditableTable
              temperature={temperature}
              updateTemperature={this.updateTemperature}
            />
          </div>
        </Col>
      );
    }

    return (
      <Grid fluid style={{ paddingLeft: 'unset' }}>
        <Row>
          <Col md={4}>
            <FormGroup>
              <ControlLabel>Name</ControlLabel>
              <FormControl
                id={uuid.v4()}
                name="reaction_name"
                type="text"
                value={reaction.name || ''}
                placeholder="Name..."
                disabled={!permitOn(reaction) || reaction.isMethodDisabled('name')}
                onChange={event => onInputChange('name', event)}
              />
            </FormGroup>
          </Col>
          {this.reactionVesselSize()}
          <Col md={3}>
            <FormGroup>
              <ControlLabel>Status</ControlLabel>
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
            </FormGroup>
          </Col>
          <Col md={3}>
            <FormGroup>
              <ControlLabel>Temperature</ControlLabel>
              <InputGroup>
                <InputGroup.Button>
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
                <FormControl
                  type="text"
                  value={temperatureDisplay || ''}
                  disabled={!permitOn(reaction) || reaction.isMethodDisabled('temperature')}
                  placeholder="Temperature..."
                  onChange={event => onInputChange('temperature', event)}
                />
                <InputGroup.Button>
                  <Button
                    disabled={!permitOn(reaction)}
                    bsStyle="success"
                    onClick={() => this.changeUnit()}
                  >
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
      </Grid>
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
