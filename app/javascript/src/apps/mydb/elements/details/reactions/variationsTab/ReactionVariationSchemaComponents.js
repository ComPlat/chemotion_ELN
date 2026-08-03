/*
Everything the variations grid shows of the reaction scheme itself: one column descriptor per input
of the scheme tab, the cells that render them, and the column headers that switch a whole column's
unit at once.

The grid around it - row identity, groups, visibility, ordering, persistence - lives in
ReactionVariationComponents, which imports from here.
*/
import React, {
  useContext, useMemo, useState
} from 'react';
import PropTypes from 'prop-types';
import { Button, Form, InputGroup } from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import { permitOn } from 'src/components/common/uis';
import DragHandle from 'src/components/common/DragHandle';
import { isSbmmSample } from 'src/utilities/ElementUtils';
import { metPrefSymbols } from 'src/utilities/metricPrefix';
import {
  getMetricMolConc, metricPrefixesMol, metricPrefixesMolConc
} from 'src/utilities/MetricsUtils';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import { MATERIAL_HEADER } from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import VariationsGridContext
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsGridContext';
import { SortableHeaderName }
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsSortHeader';
import {
  CoefficientField,
  DrySolventCheckBox,
  EquivalentOrYield,
  GaseousInputFields,
  MassField,
  MaterialActivity,
  MaterialAmountMol,
  MaterialConcentration,
  MaterialLoading,
  MaterialNameWithIupac,
  MaterialRef,
  MaterialVolume,
  SwitchTargetReal,
  VolumeRatio,
  VOLUME_METRIC_PREFIXES,
  volumeMetricPrefix,
  molMetricPrefix
} from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';
import { GROUP_ID_SEPARATOR } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import REACTION_FIELDS from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationReactionFields';
import { STICKY_NAME_CLASS } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationComponents';

const MAT_GROUPS = ['starting_materials', 'reactants', 'solvents', 'products'];
const REACTION_FIELDS_GROUP = 'reaction_fields';

const MAT_GROUP_TITLES = {
  starting_materials: 'Starting material',
  reactants: 'Reactant',
  solvents: 'Solvent',
  products: 'Product',
};
const MASS_METRIC_PREFIXES = ['m', 'n', 'u'];

const isEmptyValue = (v) => v === null || v === undefined || Number.isNaN(v) || v === 0;

// Hours and Kelvin, so a gas phase column sorts by what the numbers mean rather than by the unit
// each row happens to be in.
const GAS_TIME_IN_HOURS = { h: 1, m: 1 / 60, s: 1 / 3600 };
const GAS_TEMPERATURE_IN_KELVIN = {
  '°C': (value) => value + 273.15,
  '°F': (value) => (((value - 32) * 5) / 9) + 273.15,
  '°K': (value) => value,
  K: (value) => value,
};

/*
Only the gas fields that carry a unit are stored as `{ value, unit }`; ppm is a bare number, the way
MaterialHandler#getFieldData reports it with a fixed 'ppm'.
*/
const gasFieldEntry = (material, gasField) => {
  const entry = material.gas_phase_data?.[gasField];
  return (entry !== null && typeof entry === 'object') ? entry : { value: entry, unit: null };
};

const gasSortValue = (material, gasField) => {
  const { value, unit } = gasFieldEntry(material, gasField);
  const numeric = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(numeric)) {
    return null;
  }

  if (gasField === 'time') {
    return numeric * (GAS_TIME_IN_HOURS[unit] ?? 1);
  }
  if (gasField === 'temperature') {
    return (GAS_TEMPERATURE_IN_KELVIN[unit] ?? ((raw) => raw))(numeric);
  }
  return numeric;
};

// Same condition the scheme tab uses to decide whether a product gets its gas phase row.
const isGasProductMaterial = (reaction, material) => (
  !!reaction?.gaseous && material?.gas_type === 'gas'
);

// Mirrors the mass metric prefix resolution of the scheme tab's GeneralMaterial row.
const massMetricPrefix = (material, isSbmm) => {
  if (isSbmm) {
    return material.reactionSchemeMetricPrefix(material.amount_as_used_mass_unit);
  }
  if (
    material.metrics
    && material.metrics.length > 2
    && MASS_METRIC_PREFIXES.indexOf(material.metrics[0]) > -1
  ) {
    return material.metrics[0];
  }
  return 'm';
};

const SolventLabel = ({ mh }) => {
  const { material, reaction, materialGroup } = mh;

  return (
    <InputGroup>
      <Form.Control
        disabled={!permitOn(reaction)}
        type="text"
        size="sm"
        value={material.external_label ?? ''}
        placeholder={
          mh.isSbmm
            ? (material.name || material.short_label || '')
            : (material.molecule?.iupac_name || '')
        }
        onChange={(event) => mh.handler.externalLabelChange(event)}
      />
      <Button
        disabled={materialGroup === 'purification_solvents' || !permitOn(reaction)}
        onClick={() => mh.handler.externalLabelCompleted()}
        size="sm"
      >
        <i className="fa fa-refresh" />
      </Button>
    </InputGroup>
  );
};

SolventLabel.propTypes = {
  mh: PropTypes.instanceOf(MaterialHandler).isRequired,
};

const PlainValue = ({ children }) => <span className="px-1">{children}</span>;

PlainValue.propTypes = {
  children: PropTypes.node,
};

const NAME_FIELD = {
  key: 'name',
  header: 'Material',
  width: 230,
  // Marks the cell for the sticky handling in updateStickyNames.
  sticky: true,
  sortValue: (material) => material.molecule?.iupac_name || material.name || material.short_label || '',
  render: (mh, { index }) => (
    <MaterialNameWithIupac mh={mh} index={index} withStickyName={false} />
  ),
};

const GENERAL_MATERIAL_SETTIGS_FIELDS = [
  NAME_FIELD,
  {
    key: 'ref',
    header: MATERIAL_HEADER.ref,
    width: 60,
    sortValue: (material) => !!material.reference,
    render: (mh) => <MaterialRef mh={mh} />,
  },
  {
    key: 'tr',
    header: MATERIAL_HEADER.tr,
    width: 64,
    sortValue: (material) => material.amount_type ?? '',
    render: (mh) => <SwitchTargetReal mh={mh} />,
  },
  {
    key: 'coefficient',
    header: MATERIAL_HEADER.reaction_coefficient,
    width: 90,
    sortValue: (material) => material.coefficient,
    render: (mh) => (mh.isSbmm ? null : <CoefficientField mh={mh} />),
  }
];

/*
One entry per grid column. `render` is handed a MaterialHandler bound to the material of that row,
so every column reuses the very same input component the scheme tab renders.
*/
const GENERAL_MATERIAL_AMOUNT_FIELDS = [
  {
    key: 'mass',
    header: MATERIAL_HEADER.mass,
    width: 150,
    unitToggle: { unit: 'g', prefixes: MASS_METRIC_PREFIXES, prefixOf: massMetricPrefix },
    sortValue: (material) => material.amount_g,
    render: (mh) => (
      <MassField
        mh={mh}
        metric={massMetricPrefix(mh.material, mh.isSbmm)}
        metricPrefixes={MASS_METRIC_PREFIXES}
      />
    ),
  },
  {
    key: 'volume',
    header: MATERIAL_HEADER.vol,
    width: 150,
    unitToggle: { unit: 'l', prefixes: VOLUME_METRIC_PREFIXES, prefixOf: volumeMetricPrefix },
    sortValue: (material) => material.amount_l,
    render: (mh) => <MaterialVolume mh={mh} className="reaction-material__volume-data" />,
  },
  {
    key: 'amount',
    header: MATERIAL_HEADER.amount,
    width: 150,
    unitToggle: { unit: 'mol', prefixes: metricPrefixesMol, prefixOf: molMetricPrefix },
    sortValue: (material) => material.amount_mol,
    render: (mh) => <MaterialAmountMol mh={mh} />,
  },
  {
    key: 'molar_mass',
    header: MATERIAL_HEADER.molar_mass,
    width: 120,
    sortValue: (material) => material.molecule_molecular_weight,
    render: (mh) => (mh.isSbmm
      ? <MaterialActivity mh={mh} />
      : <PlainValue>{mh.molarWeightValue(true)}</PlainValue>),
  },
  {
    key: 'density',
    header: MATERIAL_HEADER.density,
    width: 80,
    sortValue: (material) => (material.has_density ? material.density : null),
    render: (mh) => <PlainValue>{mh.material.has_density ? mh.material.density : 'undefined'}</PlainValue>,
  },
  {
    key: 'purity',
    header: MATERIAL_HEADER.purity,
    width: 80,
    sortValue: (material) => material.purity,
    render: (mh) => {
      const { purity } = mh.material;
      return <PlainValue>{(purity === null || purity === undefined || purity === '') ? 0 : purity}</PlainValue>;
    },
  },
  {
    key: 'loading',
    header: MATERIAL_HEADER.loading,
    width: 130,
    // Only rendered for reactions with polymers, matching the scheme tab's loading column.
    requiresLoadingColumn: true,
    sortValue: (material) => material.loading,
    render: (mh, { showLoadingColumn }) => (
      <MaterialLoading mh={mh} showLoadingColumn={showLoadingColumn} />
    ),
  },
  {
    key: 'concn',
    header: MATERIAL_HEADER.concn,
    width: 150,
    unitToggle: {
      unit: 'mol/l',
      prefixes: metricPrefixesMolConc,
      prefixOf: (material) => getMetricMolConc(material),
    },
    sortValue: (material) => material.concn,
    render: (mh) => <MaterialConcentration mh={mh} />,
  },
  {
    key: 'eq',
    header: MATERIAL_HEADER.eq,
    width: 150,
    sortValue: (material) => material.equivalent,
    render: (mh, { displayYieldField }) => (
      <EquivalentOrYield mh={mh} displayYieldField={displayYieldField} />
    ),
  },
];

const SOLVENT_FIELDS = [
  NAME_FIELD,
  {
    key: 'dry_solvent',
    header: 'Dry',
    width: 60,
    sortValue: (material) => !!material.dry_solvent,
    render: (mh) => <DrySolventCheckBox mh={mh} />,
  },
  {
    key: 'tr',
    header: MATERIAL_HEADER.tr,
    width: 64,
    render: (mh) => <SwitchTargetReal mh={mh} />,
  },
  {
    key: 'label',
    header: 'Label',
    width: 220,
    sortValue: (material) => material.external_label ?? '',
    render: (mh) => <SolventLabel mh={mh} />,
  },
  {
    key: 'volume',
    header: MATERIAL_HEADER.vol,
    width: 150,
    sortValue: (material) => material.amount_l,
    render: (mh) => <MaterialVolume mh={mh} className="reaction-material__solvent-volume-data" />,
  },
  {
    key: 'ratio',
    header: 'Ratio',
    width: 90,
    sortValue: (material, reaction) => reaction.volumeRatioByMaterialId(material.id),
    render: (mh) => <VolumeRatio mh={mh} />,
  },
];

/*
Gas phase inputs, which the scheme tab shows as an extra row under a gaseous product. Only the three
editable ones are columns here; turnover number and turnover frequency are derived and read-only in
GaseousInputFields, so they would just be dead columns.

The columns exist only for product slots where some variation actually has a gaseous product - see
FIELDS_BY_GROUP.products below - and within them a row renders nothing unless its own product is the
gas one (`isGasProduct`), since a variation may well have turned the gas mode off.
*/
const GAS_PHASE_FIELDS = [
  // ppm has no unit to switch, so it gets no header unit button either.
  { key: 'gas_time', header: 'Time', gasField: 'time', unitSwitchable: true },
  { key: 'gas_temperature', header: 'Temp', gasField: 'temperature', unitSwitchable: true },
  { key: 'gas_ppm', header: 'ppm', gasField: 'part_per_million' },
].map(({
  key, header, gasField, unitSwitchable
}) => ({
  key,
  header,
  width: 150,
  ...(unitSwitchable ? { unitToggle: { gasField } } : {}),
  sortValue: (material) => gasSortValue(material, gasField),
  render: (mh, { isGasProduct }) => (
    isGasProduct ? <GaseousInputFields mh={mh} field={gasField} /> : null
  ),
}));

const GENERAL_MATERIAL_FIELDS = [...GENERAL_MATERIAL_SETTIGS_FIELDS, ...GENERAL_MATERIAL_AMOUNT_FIELDS];
const GENERAL_GAS_MATERIAL_FIELDS = [
  ...GENERAL_MATERIAL_SETTIGS_FIELDS,
  ...GAS_PHASE_FIELDS,
  ...GENERAL_MATERIAL_AMOUNT_FIELDS
];

/*
What one material column sorts on. A slot a variation does not fill sorts as empty rather than
throwing, and the amounts are read in their base unit, so switching the column's unit leaves the
order alone.
*/
const materialSortValue = (row, matGroup, sampleIdx, field) => {
  const variationReaction = row?.data ?? null;
  const material = variationReaction?.[matGroup]?.[sampleIdx] ?? null;
  if (!material || !field.sortValue) {
    return null;
  }

  return field.sortValue(material, variationReaction) ?? null;
};

const FIELDS_BY_GROUP = {
  starting_materials: () => GENERAL_MATERIAL_FIELDS,
  reactants: () => GENERAL_MATERIAL_FIELDS,
  products: (gasType) => gasType ? GENERAL_GAS_MATERIAL_FIELDS : GENERAL_MATERIAL_FIELDS,
  solvents: () => SOLVENT_FIELDS,
};

/*
Builds the MaterialHandler for one material of one row. `matGroup` may be null (no slot in view),
in which case there is nothing to render.
*/
const useMaterialHandler = (data, matGroup, sampleIdx) => {
  const { getRowHandler } = useContext(VariationsGridContext);
  const variationReaction = data?.data ?? null;
  const material = (matGroup && variationReaction?.[matGroup]?.[sampleIdx]) || null;

  // Only the equivalent/weight-percentage selector reads this, and it is per material, so cell-local
  // state is the right scope for it.
  const [fieldToShow, setFieldToShow] = useState(
    () => (material && !isEmptyValue(material.weight_percentage) ? 'weight percentage' : 'molar mass')
  );

  const rowHandler = variationReaction ? getRowHandler(data) : null;
  // Read as a dependency rather than only inside the factory, so a change of the equivalent lock
  // rebuilds the handler instead of leaving the disabled states stale.
  const lockEquivColumn = rowHandler ? rowHandler.lockEquivColumn : false;

  return useMemo(() => {
    if (!material || !rowHandler) {
      return null;
    }
    return new MaterialHandler({
      index: sampleIdx,
      material,
      reaction: variationReaction,
      materialGroup: matGroup,
      onChange: rowHandler.handleMaterialsChange,
      setFieldToShow,
      fieldToShow,
      mixtureComponents: [],
      setMixtureComponents: () => {},
      lockEquivColumn,
    });
  }, [material, variationReaction, matGroup, rowHandler, fieldToShow, lockEquivColumn]);
};

/*
Renders a single input of a single material. `matGroup`/`sampleIdx`/`field` are fixed per column,
the row supplies the variation reaction.
*/
const MaterialFieldCell = ({
  data, colId, matGroup, sampleIdx, field
}) => {
  const { columnUnits } = useContext(VariationsGridContext);
  const mh = useMaterialHandler(data, matGroup, sampleIdx);

  if (!mh) {
    return null;
  }

  const variationReaction = mh.reaction;
  const input = field.render(mh, {
    index: sampleIdx + 1,
    showLoadingColumn: !!variationReaction.hasPolymers(),
    displayYieldField: variationReaction.products.every(
      (product) => !(product.conversion_rate && product.conversion_rate !== 0)
    ),
    isGasProduct: isGasProductMaterial(variationReaction, mh.material),
  });

  if (!field.unitToggle) {
    return input;
  }

  /*
  NumeralInputWithUnitsCompo copies `metricPrefix` into local state when it mounts and never reads
  that prop again, so the unit picked in the column header would otherwise reach the material but
  not the input showing it. Keying on the column's unit remounts the input, which then seeds itself
  from the material that the header has just updated.
  */
  return (
    <React.Fragment key={columnUnits[colId] ?? ''}>
      {input}
    </React.Fragment>
  );
};

MaterialFieldCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
  }).isRequired,
  colId: PropTypes.string.isRequired,
  matGroup: PropTypes.string.isRequired,
  sampleIdx: PropTypes.number.isRequired,
  field: PropTypes.shape({
    render: PropTypes.func.isRequired,
    unitToggle: PropTypes.object,
  }).isRequired,
};

/*
Renders one reaction-level input of one variation. Unlike the material cells this needs no
MaterialHandler - the scheme tab's reaction fields all work off the reaction plus the row's
ReactionUpdateHandler.
*/
const ReactionFieldCell = ({ data, field }) => {
  const { getRowHandler } = useContext(VariationsGridContext);
  const reaction = data?.data ?? null;

  if (!reaction) {
    return null;
  }
  if (field.requiresNonInteraction && reaction.isInteractionReaction()) {
    return null;
  }

  return field.render(reaction, getRowHandler(data));
};

ReactionFieldCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
  }).isRequired,
  field: PropTypes.shape({
    render: PropTypes.func.isRequired,
    requiresNonInteraction: PropTypes.bool,
  }).isRequired,
};

/*
The cycles the gas phase unit buttons walk through, mirroring the conversions of convertTime and
convertTemperature. Kelvin also occurs as '°K', which is not in the cycle and so falls back to its
first entry - the very step the conversion makes of it as well.
*/
const GAS_UNIT_CYCLES = {
  time: ['h', 'm', 's'],
  temperature: ['°C', '°F', 'K'],
};

/*
What a unit switchable column is currently in: the metric prefix for the amount fields, whose unit
is fixed, and the unit itself for the gas phase fields, which have no prefix.
*/
const materialUnitOf = (material, unitToggle) => (
  unitToggle.gasField
    ? material.gas_phase_data?.[unitToggle.gasField]?.unit ?? ''
    : unitToggle.prefixOf(material, isSbmmSample(material))
);

const unitToggleLabel = (unit, unitToggle) => (
  unitToggle.gasField ? unit : `${metPrefSymbols[unit] ?? ''}${unitToggle.unit}`
);

const nextUnitOf = (unit, unitToggle) => {
  const cycle = unitToggle.gasField ? GAS_UNIT_CYCLES[unitToggle.gasField] : unitToggle.prefixes;
  return cycle[(cycle.indexOf(unit) + 1) % cycle.length];
};

/*
Header of a column whose cells carry a unit switch, e.g. mass or volume.

In the scheme tab a unit is switched one material at a time, which in a grid of variations means
clicking the very same button once per row. The header button does that in one go: it advances every
row of the column by one step of the same cycle the cell buttons walk through, so a column that is
in one unit throughout stays that way.

The unit is held in the grid instead of being read back from the materials, because the inputs copy
their prefix into local state when they mount and never look at that prop again - see `columnUnits`
in VariationSchemaTable for how the cells are made to pick a new one up.
*/
const MaterialUnitHeader = ({
  displayName, colId, matGroup, sampleIdx, unitToggle, column, enableSorting, progressSort
}) => {
  const {
    variations, getRowHandler, columnUnits, setColumnUnit
  } = useContext(VariationsGridContext);

  const materialOf = (variation) => variation.data?.[matGroup]?.[sampleIdx] ?? null;
  const rows = variations.filter((variation) => {
    const material = materialOf(variation);
    if (!material) {
      return false;
    }
    // The gas phase cells render nothing unless the row's own product is the gaseous one.
    return unitToggle.gasField ? isGasProductMaterial(variation.data, material) : true;
  });

  const firstMaterial = rows.length ? materialOf(rows[0]) : null;
  // Until the header has been used, the column shows whatever unit its first row brought along.
  const unit = columnUnits[colId] ?? (firstMaterial ? materialUnitOf(firstMaterial, unitToggle) : null);

  const switchUnits = () => {
    const nextCoUnit = nextUnitOf(unit, unitToggle);
    setColumnUnit(colId, nextCoUnit);

    rows.forEach((variation) => {
      const material = materialOf(variation);
      const mh = new MaterialHandler({
        index: sampleIdx,
        material,
        reaction: variation.data,
        materialGroup: matGroup,
        onChange: getRowHandler(variation).handleMaterialsChange,
      });

      if (unitToggle.gasField) {
        // The reducer converts the value and derives the next unit from the one handed to it, so
        // every row advances from whatever unit it happens to be in.
        const { value, unit: rowUnit } = mh.getFieldData(unitToggle.gasField, material.gas_phase_data || {}, unit);
        mh.handler.gasFieldsUnitsChanged({ metricUnit: rowUnit, value }, unitToggle.gasField);
        return;
      }

      mh.handler.metricsChange({
        metricUnit: unitToggle.unit,
        metricPrefix: nextCoUnit,
      });
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
          disabled={!rows.some((variation) => permitOn(variation.data))}
          onClick={switchUnits}
        >
          {unitToggleLabel(unit, unitToggle)}
        </Button>
      )}
    </div>
  );
};

MaterialUnitHeader.propTypes = {
  displayName: PropTypes.string.isRequired,
  colId: PropTypes.string.isRequired,
  matGroup: PropTypes.string.isRequired,
  sampleIdx: PropTypes.number.isRequired,
  unitToggle: PropTypes.shape({
    unit: PropTypes.string,
    prefixes: PropTypes.arrayOf(PropTypes.string),
    prefixOf: PropTypes.func,
    gasField: PropTypes.string,
  }).isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  column: PropTypes.object,
  enableSorting: PropTypes.bool,
  progressSort: PropTypes.func,
};

MaterialUnitHeader.defaultProps = {
  column: null,
  enableSorting: false,
  progressSort: () => {},
};

const schemaBuildColumnGroups = (variations) => {
  /*
   Recomputed on every render on purpose: the parent mutates the `variations` array in place and
   re-sets the same reference, so any dependency array keyed on `variations` would go stale. The
   loops are over a handful of variations, and `columnDefs` below is memoized on the resulting shape
   so AG Grid still only rebuilds its columns when the shape actually changes.
   */
  const maxNumberOfSamples = Object.fromEntries(
    MAT_GROUPS.map((matGroup) => [
      matGroup,
      variations.reduce((max, variation) => Math.max(max, variation.data?.[matGroup]?.length ?? 0), 0),
    ])
  );
  const showLoadingColumn = variations.some((variation) => !!variation.data?.hasPolymers());
  const showGasColumns = variations.map((variation) => (
    (variation.data?.products ?? []).map(
      (product) => isGasProductMaterial(variation.data, product)
    )
  ));

  const groups = [];

  MAT_GROUPS.forEach((matGroup) => {
    const numberOfSamples = maxNumberOfSamples[matGroup] || 0;
    const fields = FIELDS_BY_GROUP[matGroup];

    for (let sampleIdx = 0; sampleIdx < numberOfSamples; sampleIdx += 1) {
      groups.push({
        groupId: `${matGroup}${GROUP_ID_SEPARATOR}${sampleIdx}`,
        headerName: `${MAT_GROUP_TITLES[matGroup]} ${sampleIdx + 1}`,
        matGroup,
        columns: fields(showGasColumns.some((x) => x[sampleIdx]))
          .filter((field) => !field.requiresLoadingColumn || showLoadingColumn)
          .map((field) => {
            const colId = `${matGroup}_${sampleIdx}_${field.key}`;

            return {
              colId,
              headerName: field.header,
              width: field.width,
              // Sorting needs a value of its own: the cells are renderers, so without this AG Grid
              // would be comparing undefined against undefined for every row.
              valueGetter: ({ data }) => materialSortValue(data, matGroup, sampleIdx, field),
              ...(field.sticky ? { cellClass: STICKY_NAME_CLASS } : {}),
              // Overrides the plain draggable header of buildColumnDefs with one that also carries
              // the column wide unit switch.
              ...(field.unitToggle ? {
                headerComponent: MaterialUnitHeader,
                headerComponentParams: {
                  colId, matGroup, sampleIdx, unitToggle: field.unitToggle
                },
              } : {}),
              cellRenderer: MaterialFieldCell,
              cellRendererParams: {
                colId, matGroup, sampleIdx, field
              },
            };
          }),
      });
    }
  });

  // The reaction-level inputs sit after the materials, following the scheme tab's reading order.
  groups.push({
    groupId: REACTION_FIELDS_GROUP,
    headerName: 'Reaction',
    columns: REACTION_FIELDS.map((field) => ({
      colId: `reaction_${field.key}`,
      headerName: field.header,
      headerTooltip: field.header,
      width: field.width,
      // The rich text fields have no sensible order, so they say so rather than sorting on a
      // truncated preview of a Quill delta.
      ...(field.sortValue
        ? { valueGetter: ({ data }) => (data?.data ? field.sortValue(data.data) : null) }
        : { sortable: false }),
      cellRenderer: ReactionFieldCell,
      cellRendererParams: { field },
    })),
  });

  return groups;

};

export {
  FIELDS_BY_GROUP,
  MAT_GROUPS,
  MAT_GROUP_TITLES,
  MaterialFieldCell,
  MaterialUnitHeader,
  ReactionFieldCell,
  isGasProductMaterial,
  schemaBuildColumnGroups,
};
