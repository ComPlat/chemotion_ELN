/*
The segment half of the variations grid: one column per editable field of the selected segment, and
the cells that edit them.

A variation carries its own copy of the reaction, segments included, so a field is edited straight on
that copy and handed to the row's ReactionUpdateHandler - the same route the material and reaction
columns take. What ends up stored is whatever `diffObjects` finds between the variation and its
parent reaction, so a segment nobody touched costs nothing.

Only the four field types ReactionVariationsUtils collects are here (text, number, select and
system-defined). The rest of the generic types - tables, uploads, drag-and-drop targets, rich text -
have no meaningful single-line form and stay in the segment tab.
*/
import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { Button, Form, InputGroup } from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import { convertUnits, getGenSI } from 'chem-generic-ui';
import Reaction from 'src/models/Reaction';
import Segment from 'src/models/Segment';
import UserStore from 'src/stores/alt/stores/UserStore';
import { permitOn } from 'src/components/common/uis';
import { Select } from 'src/components/common/Select';
import DragHandle from 'src/components/common/DragHandle';
import VariationsGridContext
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsGridContext';
import { SortableHeaderName }
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsSortHeader';

/*
Not GROUP_ID_SEPARATOR: `syncActiveSlot` reads every group id containing that separator as a
material slot, and would try to name a segment layer after a material.
*/
const SEGMENT_GROUP_PREFIX = 'segment';

const COLUMN_WIDTHS = {
  text: 200,
  number: 110,
  select: 180,
  'system-defined': 150,
};

const segmentKlassOf = (segmentLabel) => (UserStore.getState().segmentKlasses || []).find(
  (klass) => klass.label === segmentLabel && klass.element_klass?.name === 'reaction'
);

const findSegment = (reaction, klass) => reaction.segments.find(
  (segment) => segment.segment_klass_id === klass.id || segment.klass_label === klass.label
) ?? null;

/*
A segment the reaction never had is built empty on the first edit, the way the segment tab builds one
when it is first opened. Until then the column renders from nothing and the variation stays clean.
*/
const emptySegment = (klass) => Segment.buildEmpty(cloneDeep(klass));

const buildSegment = (reaction, klass) => {
  /*
  Assigned rather than pushed: `Reaction#segments` hands out an empty array when it has none of its
  own, so a push would land nowhere. The setter is what stores them, and it rebuilds every entry as
  a Segment, so the one to edit is read back from the reaction afterwards.
  */
  reaction.segments = [...reaction.segments, emptySegment(klass)];
  return findSegment(reaction, klass);
};

const fieldOf = (segment, layerKey, fieldKey) => {
  const layer = segment?.properties?.layers?.[layerKey];
  return (layer?.fields ?? []).find((entry) => entry.field === fieldKey) ?? null;
};

// Units of a system-defined field, the way the generic UI itself resolves them: by the quantity its
// `option_layers` names.
const unitsOf = (field) => getGenSI(field.option_layers) ?? [];

const unitLabel = (units, unit) => units.find((entry) => entry.key === unit)?.label ?? unit;

/*
Not every quantity converts by a ratio - temperature does not - so this goes through the generic
unit conversion rather than scaling by the units' factors. An unconvertible value (empty, or a
quantity chem-units does not know) is left as it is rather than replaced by null.
*/
const convertValue = (value, fromUnit, toUnit, quantity) => {
  if (value === '' || value === null || value === undefined || !fromUnit || !toUnit) {
    return value;
  }
  if (fromUnit === toUnit) {
    return value;
  }

  const converted = convertUnits(quantity, value, fromUnit, toUnit);
  return converted === null || converted === undefined ? value : converted;
};

const selectOptionsOf = (field) => (field.options ?? []).map((option) => ({
  value: option.key ?? option.value ?? option.label,
  label: option.label ?? option.key ?? option.value,
}));

/*
What one segment column sorts on: the field's own value, in whichever unit the row holds it. A
variation with no segment yet, or one whose klass has since lost the field, sorts as empty.
*/
const segmentSortValue = (row, segmentLabel, layerKey, field) => {
  const reaction = row?.data ?? null;
  const klass = reaction ? segmentKlassOf(segmentLabel) : null;
  const value = klass
    ? fieldOf(findSegment(reaction, klass), layerKey, field.fieldKey)?.value
    : null;

  if (value === null || value === undefined || value === '') {
    return null;
  }
  return field.type === 'number' || field.type === 'system-defined' ? Number(value) : value;
};

/*
Renders one field of one variation's segment. `segmentLabel`/`layerKey`/`fieldKey` are fixed per
column, the row supplies the variation reaction.
*/
const SegmentFieldCell = ({
  data, colId, segmentLabel, layerKey, fieldKey, field
}) => {
  const { getRowHandler, columnUnits } = useContext(VariationsGridContext);
  const reaction = data?.data ?? null;

  if (!reaction) {
    return null;
  }

  const klass = segmentKlassOf(segmentLabel);
  if (!klass) {
    return null;
  }

  const currentField = fieldOf(findSegment(reaction, klass), layerKey, fieldKey);
  const value = currentField?.value ?? '';
  const disabled = !permitOn(reaction);

  const commit = (apply) => {
    const existing = findSegment(reaction, klass);
    const segment = existing ?? buildSegment(reaction, klass);
    const target = fieldOf(segment, layerKey, fieldKey);
    if (!target) {
      return;
    }

    /*
    A segment first filled in after the column header has switched the unit starts in that unit,
    so the column does not end up half in one unit and half in another.
    */
    if (!existing && field.type === 'system-defined' && columnUnits[colId]) {
      target.value_system = columnUnits[colId];
    }

    apply(target);
    segment.changed = true;
    getRowHandler(data).props.onReactionChange(reaction);
  };

  if (field.type === 'select') {
    const options = selectOptionsOf(field);

    return (
      <Select
        size="sm"
        className="w-100"
        isClearable
        isDisabled={disabled}
        options={options}
        value={options.find((option) => option.value === value) ?? null}
        onChange={(option) => commit((target) => { target.value = option?.value ?? ''; })}
      />
    );
  }

  if (field.type === 'system-defined') {
    const units = unitsOf(field);
    const unit = currentField?.value_system || columnUnits[colId] || units[0]?.key || '';

    const switchUnit = () => {
      const nextUnit = units[(units.findIndex((entry) => entry.key === unit) + 1) % units.length];
      commit((target) => {
        // The value keeps meaning the same thing: it is converted into the unit it is now read in.
        target.value = convertValue(target.value, unit, nextUnit.key, field.option_layers);
        target.value_system = nextUnit.key;
      });
    };

    return (
      <InputGroup size="sm">
        <Form.Control
          type="number"
          size="sm"
          value={value}
          disabled={disabled}
          onChange={(event) => commit((target) => { target.value = event.target.value; })}
        />
        <Button
          variant="light"
          size="sm"
          disabled={disabled || units.length < 2}
          title={units.length < 2 ? undefined : `Switch the unit of "${field.label || fieldKey}"`}
          onClick={switchUnit}
        >
          {unitLabel(units, unit)}
        </Button>
      </InputGroup>
    );
  }

  return (
    <Form.Control
      type={field.type === 'number' ? 'number' : 'text'}
      step={field.type === 'number' ? 1 : undefined}
      size="sm"
      value={value}
      disabled={disabled}
      onChange={(event) => commit((target) => { target.value = event.target.value; })}
    />
  );
};

SegmentFieldCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
  }).isRequired,
  colId: PropTypes.string.isRequired,
  segmentLabel: PropTypes.string.isRequired,
  layerKey: PropTypes.string.isRequired,
  fieldKey: PropTypes.string.isRequired,
  field: PropTypes.shape({
    type: PropTypes.string.isRequired,
    label: PropTypes.string,
    option_layers: PropTypes.string,
    value_system: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    options: PropTypes.array,
  }).isRequired,
};

/*
Header of a system-defined column, carrying the unit switch for the whole column.

Same bargain as MaterialUnitHeader in the scheme half: one click does what clicking the unit button
in every cell of the column would do, so a column that is in one unit throughout stays that way. A
variation that has no value here yet is left alone - switching a unit is not a reason to give it a
segment - and its cell adopts the column's unit if it is ever filled in.
*/
const SegmentUnitHeader = ({
  displayName, colId, segmentLabel, layerKey, fieldKey, field, column, enableSorting, progressSort
}) => {
  const {
    variations, getRowHandler, columnUnits, setColumnUnit
  } = useContext(VariationsGridContext);

  const klass = segmentKlassOf(segmentLabel);
  const units = unitsOf(field);
  const segmentOf = (variation) => (klass ? findSegment(variation.data, klass) : null);
  const rows = variations.filter((variation) => fieldOf(segmentOf(variation), layerKey, fieldKey));

  const firstField = rows.length ? fieldOf(segmentOf(rows[0]), layerKey, fieldKey) : null;
  // Until the header has been used, the column shows whatever unit its first row brought along.
  const unit = columnUnits[colId] || firstField?.value_system || units[0]?.key || '';

  const switchUnits = () => {
    const nextUnit = units[(units.findIndex((entry) => entry.key === unit) + 1) % units.length];
    setColumnUnit(colId, nextUnit.key);

    rows.forEach((variation) => {
      const segment = segmentOf(variation);
      const target = fieldOf(segment, layerKey, fieldKey);
      // Converted out of the unit the row is actually in, so rows that were left behind in an
      // earlier unit still end up with the right number.
      target.value = convertValue(
        target.value, target.value_system || unit, nextUnit.key, field.option_layers
      );
      target.value_system = nextUnit.key;
      segment.changed = true;
      getRowHandler(variation).props.onReactionChange(variation.data);
    });
  };

  return (
    <div className="d-flex align-items-center gap-1 w-100">
      <DragHandle />
      <SortableHeaderName
        displayName={displayName}
        column={column}
        enableSorting={enableSorting}
        progressSort={progressSort}
      />
      {unit && (
        <Button
          variant="light"
          size="xsm"
          className="variations-unit-switch ms-auto py-0 px-1 flex-shrink-0"
          title={`Switch the unit of "${displayName}" in every variation`}
          disabled={units.length < 2 || !rows.some((variation) => permitOn(variation.data))}
          onClick={switchUnits}
        >
          {unitLabel(units, unit)}
        </Button>
      )}
    </div>
  );
};

SegmentUnitHeader.propTypes = {
  displayName: PropTypes.string.isRequired,
  colId: PropTypes.string.isRequired,
  segmentLabel: PropTypes.string.isRequired,
  layerKey: PropTypes.string.isRequired,
  fieldKey: PropTypes.string.isRequired,
  field: PropTypes.shape({
    option_layers: PropTypes.string,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  column: PropTypes.object,
  enableSorting: PropTypes.bool,
  progressSort: PropTypes.func,
};

SegmentUnitHeader.defaultProps = {
  column: null,
  enableSorting: false,
  progressSort: () => {},
};

/*
One column group per layer of the selected segment, mirroring how the segment tab stacks its layers -
so a field is found under the same heading it carries there.
*/
const segmentBuildColumnGroups = (segmentLabel, segmentFields) => {
  const layers = new Map();

  Object.values(segmentFields ?? {}).forEach((field) => {
    const { layerKey } = field;
    if (!layers.has(layerKey)) {
      layers.set(layerKey, { headerName: field.layerLabel || layerKey, fields: [] });
    }
    layers.get(layerKey).fields.push(field);
  });

  return [...layers.entries()].map(([layerKey, layer]) => ({
    groupId: `${SEGMENT_GROUP_PREFIX}_${layerKey}`,
    headerName: layer.headerName,
    columns: layer.fields.map((field) => {
      const colId = `${SEGMENT_GROUP_PREFIX}_${layerKey}_${field.fieldKey}`;
      const params = {
        colId, segmentLabel, layerKey, fieldKey: field.fieldKey, field
      };

      return {
        colId,
        headerName: field.label || field.fieldKey,
        headerTooltip: field.label || field.fieldKey,
        width: COLUMN_WIDTHS[field.type] ?? 150,
        // The cells are renderers, so sorting needs the value spelled out for it.
        valueGetter: ({ data }) => segmentSortValue(data, segmentLabel, layerKey, field),
        // Overrides the plain draggable header of buildColumnDefs with one that also carries the
        // column wide unit switch.
        ...(field.type === 'system-defined' ? {
          headerComponent: SegmentUnitHeader,
          headerComponentParams: params,
        } : {}),
        cellRenderer: SegmentFieldCell,
        cellRendererParams: params,
      };
    }),
  }));
};

export default segmentBuildColumnGroups;
// The last three are what the panel under the grid needs to hand the same segment to GenericSGDetails.
export {
  segmentBuildColumnGroups,
  segmentKlassOf,
  findSegment,
  emptySegment,
};
