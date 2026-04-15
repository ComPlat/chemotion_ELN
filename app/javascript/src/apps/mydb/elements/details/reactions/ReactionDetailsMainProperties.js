import React, { useState } from 'react';
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

// ---------- pure utils ----------

const wrapAsEvent = (value) => ({ target: { value } });

const nextTemperatureUnit = (currentUnit) => {
  const units = Reaction.temperature_unit;
  const index = units.indexOf(currentUnit);
  return units[(index + 1) % units.length];
};

const findStatusOption = (value) =>
  statusOptions.find((option) => option.value === value);

// ---------- hook ----------

const useReactionTemperature = (reaction, onInputChange) => {
  const [showTemperatureChart, setShowTemperatureChart] = useState(false);

  const toggleTemperatureChart = () =>
    setShowTemperatureChart((prev) => !prev);

  const updateTemperatureData = (newData) => {
    onInputChange('temperatureData', { ...reaction.temperature, data: newData });
  };

  const cycleTemperatureUnit = () => {
    onInputChange(
      'temperatureUnit',
      nextTemperatureUnit(reaction.temperature.valueUnit)
    );
  };

  return {
    showTemperatureChart,
    toggleTemperatureChart,
    updateTemperatureData,
    cycleTemperatureUnit,
  };
};

// ---------- presentational sub-components ----------

const ReactionNameField = ({ reaction, onInputChange, disabled }) => (
  <Col sm={6}>
    <Form.Group>
      <Form.Label>Name</Form.Label>
      <Form.Control
        id={uuid.v4()}
        name="reaction_name"
        type="text"
        value={reaction.name || ''}
        placeholder="Name..."
        disabled={disabled}
        onChange={(event) => onInputChange('name', event)}
      />
    </Form.Group>
  </Col>
);

const ReactionStatusField = ({ reaction, onInputChange, disabled }) => {
  const handleChange = (option) =>
    onInputChange('status', wrapAsEvent(option?.value || null));

  return (
    <Col sm={3}>
      <Form.Group>
        <Form.Label>Status</Form.Label>
        <Select
          name="status"
          isClearable
          options={statusOptions}
          value={findStatusOption(reaction.status)}
          isDisabled={disabled}
          onChange={handleChange}
        />
      </Form.Group>
    </Col>
  );
};

const TemperatureChartToggle = ({ onClick, disabled }) => (
  <OverlayTrigger
    placement="bottom"
    overlay={<Tooltip id="show_temperature">Show temperature chart</Tooltip>}
  >
    <Button
      disabled={disabled}
      className="clipboardBtn"
      onClick={onClick}
      variant="light"
    >
      <i className="fa fa-area-chart" />
    </Button>
  </OverlayTrigger>
);

const ReactionTemperatureField = ({
  reaction,
  onInputChange,
  onToggleChart,
  onCycleUnit,
  controlsDisabled,
  inputDisabled,
}) => (
  <Col sm={3}>
    <Form.Group>
      <Form.Label>Temperature</Form.Label>
      <InputGroup>
        <TemperatureChartToggle
          onClick={onToggleChart}
          disabled={controlsDisabled}
        />
        <Form.Control
          type="text"
          value={reaction.temperature_display || ''}
          disabled={inputDisabled}
          placeholder="Temperature..."
          onChange={(event) => onInputChange('temperature', event)}
        />
        <Button
          disabled={controlsDisabled}
          variant="light"
          onClick={onCycleUnit}
        >
          {reaction.temperature.valueUnit}
        </Button>
      </InputGroup>
    </Form.Group>
  </Col>
);

const TemperatureChart = ({ temperature, onUpdate }) => (
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
        updateTemperature={onUpdate}
      />
    </Col>
  </Row>
);

// ---------- main component ----------

const ReactionDetailsMainProperties = ({ reaction, onInputChange }) => {
  const {
    showTemperatureChart,
    toggleTemperatureChart,
    updateTemperatureData,
    cycleTemperatureUnit,
  } = useReactionTemperature(reaction, onInputChange);

  const editable = permitOn(reaction);
  const nameDisabled = !editable || reaction.isMethodDisabled('name');
  const statusDisabled = !editable || reaction.isMethodDisabled('status');
  const temperatureInputDisabled =
    !editable || reaction.isMethodDisabled('temperature');

  return (
    <>
      <Row className="my-3">
        <ReactionNameField
          reaction={reaction}
          onInputChange={onInputChange}
          disabled={nameDisabled}
        />
        <ReactionStatusField
          reaction={reaction}
          onInputChange={onInputChange}
          disabled={statusDisabled}
        />
        <ReactionTemperatureField
          reaction={reaction}
          onInputChange={onInputChange}
          onToggleChart={toggleTemperatureChart}
          onCycleUnit={cycleTemperatureUnit}
          controlsDisabled={!editable}
          inputDisabled={temperatureInputDisabled}
        />
      </Row>

      {showTemperatureChart && (
        <TemperatureChart
          temperature={reaction.temperature}
          onUpdate={updateTemperatureData}
        />
      )}
    </>
  );
};

ReactionDetailsMainProperties.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  reaction: PropTypes.object,
  onInputChange: PropTypes.func,
};

ReactionDetailsMainProperties.defaultProps = {
  reaction: {},
  onInputChange: () => {},
};

export default ReactionDetailsMainProperties;
