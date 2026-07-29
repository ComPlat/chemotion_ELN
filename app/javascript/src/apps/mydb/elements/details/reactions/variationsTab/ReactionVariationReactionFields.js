import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Badge, Button, Form, InputGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import { Select } from 'src/components/common/Select';
import OlsTreeSelect from 'src/components/OlsComponent';
import QuillEditor from 'src/components/QuillEditor';
import QuillViewer from 'src/components/QuillViewer';
import AppModal from 'src/components/common/AppModal';
import { contentToText } from 'src/utilities/quillFormat';
import { permitOn } from 'src/components/common/uis';
import { purificationOptions } from 'src/components/staticDropdownOptions/options';
import { observationPurification } from 'src/utilities/reactionPredefined';
import { textToLines } from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionConditions';
import ReactionUpdateHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';

/*
The reaction-level inputs of the scheme tab, one per grid column.

The scheme tab lays these out as full-width Row/Col form groups, which cannot be dropped into a grid
cell as-is, so each one is rebuilt here as a single compact control. They all drive the same
`onInputChange(type, value)` contract that ReactionUpdateHandler already implements, so the update
semantics are the handler's, not a reimplementation.
*/

const VOLUME_METRIC_PREFIXES = ['m', 'u', 'n'];
const TIME_PLACEHOLDER = 'DD/MM/YYYY hh:mm:ss';
const RICH_TEXT_PREVIEW_LENGTH = 150;

const handlerPropType = PropTypes.instanceOf(ReactionUpdateHandler).isRequired;
const reactionPropType = PropTypes.instanceOf(Reaction).isRequired;

const ReactionTypeField = ({ reaction, handler }) => (
  <OlsTreeSelect
    selectName="rxno"
    selectedValue={(reaction.rxno && reaction.rxno.trim()) || ''}
    onSelectChange={(event) => handler.props.onInputChange('rxno', event.trim())}
    selectedDisable={!permitOn(reaction) || reaction.isMethodDisabled('rxno')}
  />
);

ReactionTypeField.propTypes = { reaction: reactionPropType, handler: handlerPropType };

/*
Read-only tags rather than the scheme tab's ReactionConditions editor: that is a reorderable list
with a header, an add-select and a text input plus delete button per line, which does not belong in
a grid cell. Editing stays in the scheme view behind "Open".
*/
const ConditionsTags = ({ reaction }) => {
  const conditions = textToLines(reaction.conditions).filter((line) => line.trim() !== '');

  if (conditions.length === 0) {
    return <span className="text-body-secondary px-1">-</span>;
  }

  return (
    <div className="d-flex flex-wrap gap-1 py-1">
      {conditions.map((condition) => (
        <Badge key={condition} bg="light" text="dark" className="border fw-normal text-wrap text-start">
          {condition}
        </Badge>
      ))}
    </div>
  );
};

ConditionsTags.propTypes = { reaction: reactionPropType };

const TemperatureField = ({ reaction, handler }) => {
  const { onInputChange } = handler.props;
  const valueUnit = reaction.temperature?.valueUnit;

  const changeUnit = () => {
    const units = Reaction.temperature_unit;
    const index = units.indexOf(valueUnit);
    onInputChange('temperatureUnit', units[(index + 1) % units.length]);
  };

  return (
    <InputGroup size="sm">
      <Form.Control
        type="text"
        size="sm"
        value={reaction.temperature_display || ''}
        disabled={!permitOn(reaction) || reaction.isMethodDisabled('temperature')}
        placeholder="Temperature..."
        onChange={(event) => onInputChange('temperature', event)}
      />
      <Button disabled={!permitOn(reaction)} variant="light" size="sm" onClick={changeUnit}>
        {valueUnit}
      </Button>
    </InputGroup>
  );
};

TemperatureField.propTypes = { reaction: reactionPropType, handler: handlerPropType };

const PhField = ({ reaction, handler }) => {
  const isDisabled = !permitOn(reaction);

  return (
    <InputGroup size="sm">
      <Button
        className="reaction-ph-operator"
        size="sm"
        disabled={isDisabled}
        variant="primary"
        onClick={() => handler.changePhOperator()}
      >
        {reaction.ph_operator || '='}
      </Button>
      <Form.Control
        type="number"
        step="any"
        size="sm"
        value={reaction.ph_value ?? ''}
        disabled={isDisabled}
        placeholder="value"
        onChange={(event) => handler.props.onInputChange('phValue', event.target.value)}
      />
    </InputGroup>
  );
};

PhField.propTypes = { reaction: reactionPropType, handler: handlerPropType };

const VesselSizeField = ({ reaction, handler }) => (
  <InputGroup size="sm">
    <Form.Control
      name="reaction_vessel_size"
      type="text"
      size="sm"
      value={reaction.vessel_size?.amount ?? ''}
      disabled={reaction.can_update === false}
      onChange={(event) => handler.updateVesselSize(event)}
      onBlur={(event) => handler.updateVesselSizeOnBlur(event)}
    />
    <Button
      size="sm"
      disabled={reaction.can_update === false}
      variant="light"
      onClick={() => handler.changeVesselSizeUnit()}
    >
      {reaction.vessel_size?.unit || 'ml'}
    </Button>
  </InputGroup>
);

VesselSizeField.propTypes = { reaction: reactionPropType, handler: handlerPropType };

const ReactionVolumeField = ({ reaction, handler }) => {
  // Same guard as the scheme tab: the field is not offered when the volume method is disabled.
  if (!permitOn(reaction) || reaction.isMethodDisabled('volume')) {
    return null;
  }

  return (
    <div className="d-flex flex-column gap-1 w-100">
      <div className="d-flex align-items-center gap-1">
        <NumeralInputWithUnitsCompo
          value={handler.parseVolumeValue(reaction.volume)}
          unit="l"
          metricPrefix="m"
          metricPrefixes={VOLUME_METRIC_PREFIXES}
          precision={5}
          size="sm"
          active
          disabled={reaction.isVolumeLocked}
          disableUnitButtonPadding
          onChange={(e) => handler.updateVolume(e)}
          onMetricsChange={(e) => handler.updateVolume(e)}
        />
        <OverlayTrigger
          overlay={<Tooltip id="lock_volume_tooltip">Lock/unlock reaction volume</Tooltip>}
        >
          <Button
            size="sm"
            variant={reaction.isVolumeLocked ? 'warning' : 'light'}
            onClick={handler.switchVolumeLock}
            className="py-0 px-1"
          >
            <i className={reaction.isVolumeLocked ? 'fa fa-lock' : 'fa fa-unlock'} />
          </Button>
        </OverlayTrigger>
      </div>
      <Form.Check
        type="checkbox"
        // Ids must stay unique across rows, unlike in the single-reaction scheme tab.
        id={`use_reaction_volume_${reaction.id}`}
        checked={reaction.use_reaction_volume || false}
        onChange={handler.handleVolumeCheckboxChange}
        label="Calculate Conc"
      />
    </div>
  );
};

ReactionVolumeField.propTypes = { reaction: reactionPropType, handler: handlerPropType };

// Mirrors ReactionDetailsDuration#setCurrentTime, including the status side effect.
const setCurrentTime = (reaction, handler, type) => {
  const { onInputChange } = handler.props;
  const currentTime = new Date().toLocaleString('en-GB').split(', ').join(' ');

  onInputChange(type, { target: { value: currentTime } });
  if (type === 'timestampStart' && (reaction.status === 'Planned' || !reaction.status)) {
    onInputChange('status', { target: { value: 'Running' } });
  } else if (type === 'timestampStop' && reaction.status === 'Running') {
    onInputChange('status', { target: { value: 'Done' } });
  }
};

const TimestampField = ({
  reaction, handler, type, valueKey
}) => {
  const isDisabled = !permitOn(reaction) || reaction.isMethodDisabled(valueKey) || reaction.gaseous;

  return (
    <InputGroup size="sm">
      <Form.Control
        type="text"
        size="sm"
        value={reaction[valueKey] || ''}
        disabled={isDisabled}
        placeholder={TIME_PLACEHOLDER}
        onChange={(event) => handler.props.onInputChange(type, event)}
      />
      <Button
        size="sm"
        variant="light"
        disabled={!permitOn(reaction) || reaction.gaseous}
        onClick={() => setCurrentTime(reaction, handler, type)}
      >
        <i className="fa fa-clock-o" aria-hidden="true" />
      </Button>
    </InputGroup>
  );
};

TimestampField.propTypes = {
  reaction: reactionPropType,
  handler: handlerPropType,
  type: PropTypes.string.isRequired,
  valueKey: PropTypes.string.isRequired,
};

const DurationField = ({ reaction, handler }) => {
  const { onInputChange } = handler.props;
  const isDisabled = !permitOn(reaction) || reaction.gaseous;
  const durationCalc = reaction.durationCalc?.();

  const handleDurationChange = (event) => {
    const nextValue = event.target.value && event.target.value.replace(',', '.');
    if (!Number.isNaN(Number(nextValue)) || nextValue === '') {
      onInputChange('duration', { nextValue });
    }
  };

  return (
    <div className="d-flex flex-column gap-1 w-100">
      <InputGroup size="sm">
        <Form.Control
          type="text"
          size="sm"
          value={reaction.durationDisplay?.dispValue || ''}
          disabled={isDisabled}
          placeholder="Input duration..."
          onChange={handleDurationChange}
        />
        <Button
          size="sm"
          variant="light"
          disabled={isDisabled}
          onClick={() => onInputChange('duration', { nextUnit: true })}
        >
          {reaction.durationUnit}
        </Button>
      </InputGroup>
      <InputGroup size="sm">
        <Form.Control type="text" size="sm" value={durationCalc || ''} disabled placeholder="From start/stop" />
        <OverlayTrigger
          overlay={<Tooltip id="copy_durationCalc_to_duration">use this duration</Tooltip>}
        >
          <Button
            size="sm"
            variant="light"
            disabled={isDisabled}
            onClick={() => onInputChange('duration', { fromStartStop: true })}
          >
            <i className="fa fa-arrow-right" aria-hidden="true" />
          </Button>
        </OverlayTrigger>
      </InputGroup>
    </div>
  );
};

DurationField.propTypes = { reaction: reactionPropType, handler: handlerPropType };

// Quill deltas, and the odd legacy plain string, flattened to one line for the cell preview.
const richTextToLine = (value) => {
  const text = typeof value === 'string' ? value : contentToText(value);
  return text.replace(/\s+/g, ' ').trim();
};

/*
A Quill editor per row is far too tall for a grid, so the cell shows a truncated plain-text preview
and opens the real editor in a modal on click. The draft is applied on "Apply" rather than on every
keystroke: each change re-renders every cell of the grid, which would make typing crawl.
*/
const RichTextField = ({
  reaction, handler, inputType, valueKey, label
}) => {
  const [showEditor, setShowEditor] = useState(false);
  const [draft, setDraft] = useState(null);

  const isReadOnly = !permitOn(reaction) || reaction.isMethodDisabled(valueKey);
  const text = richTextToLine(reaction[valueKey]);
  const preview = text.length > RICH_TEXT_PREVIEW_LENGTH
    ? `${text.slice(0, RICH_TEXT_PREVIEW_LENGTH)}…`
    : text;

  const openEditor = () => {
    setDraft(reaction[valueKey]);
    setShowEditor(true);
  };

  const applyDraft = () => {
    handler.props.onInputChange(inputType, draft);
    setShowEditor(false);
  };

  return (
    <>
      <Button
        variant="link"
        size="sm"
        className="text-start text-decoration-none text-body p-1 w-100 text-truncate"
        title={text || label}
        onClick={openEditor}
      >
        {preview || <span className="text-body-secondary">-</span>}
      </Button>
      {showEditor && (
        <AppModal
          show
          onHide={() => setShowEditor(false)}
          title={label}
          size="lg"
          closeLabel="Cancel"
          primaryActionLabel={isReadOnly ? undefined : 'Apply'}
          onPrimaryAction={isReadOnly ? undefined : applyDraft}
        >
          {isReadOnly
            ? <QuillViewer value={draft} />
            : <QuillEditor value={draft} height="320px" onChange={setDraft} />}
        </AppModal>
      )}
    </>
  );
};

RichTextField.propTypes = {
  reaction: reactionPropType,
  handler: handlerPropType,
  inputType: PropTypes.string.isRequired,
  valueKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};

const PurificationField = ({ reaction, handler }) => {
  const { onInputChange, onReactionChange } = handler.props;
  const selected = reaction.purification ?? [];

  // Mirrors ReactionDetailsPurification#handlePurificationChange: picking an option that has a
  // predefined observation appends that text to the reaction instead of only storing the value.
  const handlePurificationChange = (options) => {
    const values = (options ?? []).map((option) => option.value);
    if (values.length === 0) {
      onInputChange('purification', { target: { value: [] } });
      return;
    }

    const selectedValue = values[values.length - 1];
    const predefined = observationPurification.find((entry) => Object.keys(entry).some(
      (key) => key.toLowerCase().localeCompare(selectedValue.toLowerCase()) === 0
    ));

    if (predefined) {
      // Mutating the reaction in place is how the scheme tab drives this too; the model is the
      // shared source of truth and onReactionChange is what propagates the change.
      // eslint-disable-next-line react-hooks/immutability
      reaction.purification = values;
      reaction.concat_text_observation(predefined[selectedValue.toLowerCase()]);
      onReactionChange(reaction);
    } else {
      onInputChange('purification', { target: { value: values } });
    }
  };

  return (
    <Select
      name="purification"
      isMulti
      isDisabled={!permitOn(reaction) || reaction.isMethodDisabled('purification')}
      options={purificationOptions}
      onChange={handlePurificationChange}
      value={purificationOptions.filter(({ value }) => selected.includes(value))}
    />
  );
};

PurificationField.propTypes = { reaction: reactionPropType, handler: handlerPropType };

/*
`requiresNonInteraction` marks the fields the scheme tab hides for interaction reactions. It is
evaluated per row, not per column, because each variation is an independent reaction and may differ.
*/
const REACTION_FIELDS = [
  {
    key: 'reaction_type',
    header: 'Type (Name Reaction)',
    width: 240,
    requiresNonInteraction: true,
    render: (reaction, handler) => <ReactionTypeField reaction={reaction} handler={handler} />,
  },
  {
    key: 'conditions',
    header: 'Conditions',
    width: 260,
    requiresNonInteraction: true,
    render: (reaction) => <ConditionsTags reaction={reaction} />,
  },
  {
    key: 'temperature',
    header: 'Temperature',
    width: 190,
    render: (reaction, handler) => <TemperatureField reaction={reaction} handler={handler} />,
  },
  {
    key: 'ph',
    header: 'pH',
    width: 150,
    render: (reaction, handler) => <PhField reaction={reaction} handler={handler} />,
  },
  {
    key: 'vessel_size',
    header: 'Vessel size',
    width: 170,
    requiresNonInteraction: true,
    render: (reaction, handler) => <VesselSizeField reaction={reaction} handler={handler} />,
  },
  {
    key: 'reaction_volume',
    header: 'Reaction volume',
    width: 230,
    render: (reaction, handler) => <ReactionVolumeField reaction={reaction} handler={handler} />,
  },
  {
    key: 'timestamp_start',
    header: 'Start',
    width: 200,
    render: (reaction, handler) => (
      <TimestampField
        reaction={reaction}
        handler={handler}
        type="timestampStart"
        valueKey="timestamp_start"
      />
    ),
  },
  {
    key: 'timestamp_stop',
    header: 'Stop',
    width: 200,
    render: (reaction, handler) => (
      <TimestampField
        reaction={reaction}
        handler={handler}
        type="timestampStop"
        valueKey="timestamp_stop"
      />
    ),
  },
  {
    key: 'duration',
    header: 'Duration',
    width: 230,
    render: (reaction, handler) => <DurationField reaction={reaction} handler={handler} />,
  },
  {
    key: 'description',
    header: 'Description',
    width: 260,
    render: (reaction, handler) => (
      <RichTextField
        reaction={reaction}
        handler={handler}
        inputType="description"
        valueKey="description"
        label="Description"
      />
    ),
  },
  {
    key: 'purification',
    header: 'Purification',
    width: 240,
    requiresNonInteraction: true,
    render: (reaction, handler) => <PurificationField reaction={reaction} handler={handler} />,
  },
  {
    key: 'observation',
    header: 'Additional information for publication and purification details',
    width: 260,
    render: (reaction, handler) => (
      <RichTextField
        reaction={reaction}
        handler={handler}
        inputType="observation"
        valueKey="observation"
        label="Additional information for publication and purification details"
      />
    ),
  },
];

export default REACTION_FIELDS;
