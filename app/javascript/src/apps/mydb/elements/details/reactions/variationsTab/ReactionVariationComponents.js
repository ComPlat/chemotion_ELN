import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import { debounce } from 'lodash';
import {
  Button, ButtonGroup, Form, InputGroup, OverlayTrigger, Popover
} from 'react-bootstrap';
import ReorderableList from 'src/components/common/ReorderableList';
import Reaction from 'src/models/Reaction';
import { permitOn } from 'src/components/common/uis';
import DragHandle from 'src/components/common/DragHandle';
import DeleteButton from 'src/components/common/DeleteButton';
import AppModal from 'src/components/common/AppModal';
import { AnalysesCell } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import ReactionUpdateHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import { MATERIAL_HEADER } from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import {
  getInitialColumnState,
  persistColumnState
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import REACTION_FIELDS from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationReactionFields';
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
  VolumeRatio
} from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';

const MAT_GROUPS = ['starting_materials', 'reactants', 'solvents', 'products'];
const MAT_GROUP_TITLES = {
  starting_materials: 'Starting material',
  reactants: 'Reactant',
  solvents: 'Solvent',
  products: 'Product',
};
const MASS_METRIC_PREFIXES = ['m', 'n', 'u'];
// Material group names contain underscores, so the group id needs a separator that cannot collide.
const GROUP_ID_SEPARATOR = '::';
// Pseudo material groups, so the row-level and reaction-level columns are toggled like the rest.
const REACTION_FIELDS_GROUP = 'reaction_fields';
const VARIATION_GROUP = 'variation_fields';
const ANALYSES_GROUP = 'analyses_fields';
// Marks the material name cells that follow the horizontal scroll inside their own group.
const STICKY_NAME_CLASS = 'variations-sticky-name';
const STICKY_NAME_FLOATING_CLASS = 'variations-sticky-name--floating';

/*
Carries the per-row update handlers into the cells.

The context value is deliberately NOT memoized: AG Grid does not re-render cell components when the
surrounding React tree re-renders, but context updates do reach them (portals keep the React tree
intact). Recreating the value on every render is what keeps every cell in sync with the mutated
Reaction models after an edit, without going through `api.refreshCells`, which would tear down and
rebuild the cell component and steal focus from the input being typed into.
*/
const VariationsGridContext = createContext({
  getRowHandler: () => null,
  setActiveVariation: () => {},
  onGroupChange: () => {},
});

const isEmptyValue = (v) => v === null || v === undefined || Number.isNaN(v) || v === 0;

// Same condition the scheme tab uses to decide whether a product gets its gas phase row.
const isGasProductMaterial = (reaction, material) => (
  !!reaction?.gaseous && material?.gas_type === 'gas'
);

// Mirrors the mass metric prefix resolution of the scheme tab's GeneralMaterial row.
const massMetricPrefix = (mh) => {
  const { material, isSbmm } = mh;
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
    render: (mh) => <MaterialRef mh={mh} />,
  },
  {
    key: 'tr',
    header: MATERIAL_HEADER.tr,
    width: 64,
    render: (mh) => <SwitchTargetReal mh={mh} />,
  },
  {
    key: 'coefficient',
    header: MATERIAL_HEADER.reaction_coefficient,
    width: 90,
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
    render: (mh) => (
      <MassField mh={mh} metric={massMetricPrefix(mh)} metricPrefixes={MASS_METRIC_PREFIXES} />
    ),
  },
  {
    key: 'volume',
    header: MATERIAL_HEADER.vol,
    width: 150,
    render: (mh) => <MaterialVolume mh={mh} className="reaction-material__volume-data" />,
  },
  {
    key: 'amount',
    header: MATERIAL_HEADER.amount,
    width: 150,
    render: (mh) => <MaterialAmountMol mh={mh} />,
  },
  {
    key: 'molar_mass',
    header: MATERIAL_HEADER.molar_mass,
    width: 120,
    render: (mh) => (mh.isSbmm
      ? <MaterialActivity mh={mh} />
      : <PlainValue>{mh.molarWeightValue(true)}</PlainValue>),
  },
  {
    key: 'density',
    header: MATERIAL_HEADER.density,
    width: 80,
    render: (mh) => <PlainValue>{mh.material.has_density ? mh.material.density : 'undefined'}</PlainValue>,
  },
  {
    key: 'purity',
    header: MATERIAL_HEADER.purity,
    width: 80,
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
    render: (mh, { showLoadingColumn }) => (
      <MaterialLoading mh={mh} showLoadingColumn={showLoadingColumn} />
    ),
  },
  {
    key: 'concn',
    header: MATERIAL_HEADER.concn,
    width: 150,
    render: (mh) => <MaterialConcentration mh={mh} />,
  },
  {
    key: 'eq',
    header: MATERIAL_HEADER.eq,
    width: 150,
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
    render: (mh) => <SolventLabel mh={mh} />,
  },
  {
    key: 'volume',
    header: MATERIAL_HEADER.vol,
    width: 150,
    render: (mh) => <MaterialVolume mh={mh} className="reaction-material__solvent-volume-data" />,
  },
  {
    key: 'ratio',
    header: 'Ratio',
    width: 90,
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
  { key: 'gas_time', header: 'Time', gasField: 'time' },
  { key: 'gas_temperature', header: 'Temp', gasField: 'temperature' },
  { key: 'gas_ppm', header: 'ppm', gasField: 'part_per_million' },
].map(({ key, header, gasField }) => ({
  key,
  header,
  width: 150,
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
  data, matGroup, sampleIdx, field
}) => {
  const mh = useMaterialHandler(data, matGroup, sampleIdx);

  if (!mh) {
    return null;
  }

  const variationReaction = mh.reaction;

  return field.render(mh, {
    index: sampleIdx + 1,
    showLoadingColumn: !!variationReaction.hasPolymers(),
    displayYieldField: variationReaction.products.every(
      (product) => !(product.conversion_rate && product.conversion_rate !== 0)
    ),
    isGasProduct: isGasProductMaterial(variationReaction, mh.material),
  });
};

MaterialFieldCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
  }).isRequired,
  matGroup: PropTypes.string.isRequired,
  sampleIdx: PropTypes.number.isRequired,
  field: PropTypes.shape({ render: PropTypes.func.isRequired }).isRequired,
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

const AnalysesLinkCell = ({ data }) => {
  const {
    onAnalysesChange, allReactionAnalyses, reactionShortLabel
  } = useContext(VariationsGridContext);

  return (
    <AnalysesCell
      analyses={data.analyses ?? []}
      allReactionAnalyses={allReactionAnalyses}
      reactionShortLabel={reactionShortLabel}
      rowId={data.label}
      disabled={!permitOn(data.data)}
      onChange={(analyses) => onAnalysesChange(data.idx, analyses)}
    />
  );
};

AnalysesLinkCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    label: PropTypes.string.isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
    analyses: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    ),
  }).isRequired,
};

const OpenVariationCell = ({ data }) => {
  const { setActiveVariation } = useContext(VariationsGridContext);

  const { onDeleteVariation } = useContext(VariationsGridContext);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <ButtonGroup>
    <Button
      variant="info"
      size="sm"
      type="button"
      onClick={() => setActiveVariation({ idx: data.idx, data: data.data })}
    >
      Open
    </Button>
      <DeleteButton
        disabled={!permitOn(data.data)}
        onClick={() => setShowConfirm(true)}
      />
      {showConfirm && (
        <AppModal
          show
          onHide={() => setShowConfirm(false)}
          animation={false}
          title="Confirm Removal"
          closeLabel="Cancel"
          primaryActionLabel="Remove variation"
          onPrimaryAction={() => {
            setShowConfirm(false);
            onDeleteVariation(data.idx);
          }}
        >
          {`Are you sure you want to remove variation ${data.label}?`}
        </AppModal>
      )}
    </ButtonGroup>
  );
};

OpenVariationCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    label: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    data: PropTypes.instanceOf(Reaction).isRequired,
  }).isRequired,
};

const GroupCell = ({ data }) => {
  const { onGroupChange } = useContext(VariationsGridContext);

  return (
    <Form.Control
      type="text"
      size="sm"
      value={data.group.join('.')}
      onChange={(event) => onGroupChange(event.target.value, data.idx)}
    />
  );
};

GroupCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
    group: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    ).isRequired,
  }).isRequired,
};

// One toolbar entry per top level group header, hiding or showing that whole group.
const GroupToggleButton = ({ group, allHidden, colIds }) => {
  const { setColumnsHidden } = useContext(VariationsGridContext);
  return (<Button
      size="sm"
      variant={allHidden ? 'dark' : 'info'}
      onClick={() => setColumnsHidden(colIds, !allHidden)}
    >
      <i className={allHidden ? 'fa fa-eye me-1' : 'fa fa-eye-slash me-1'} aria-hidden="true"/>
      {group.headerName}
    </Button>
  );
};

GroupToggleButton.propTypes = {
  group: PropTypes.shape({
    headerName: PropTypes.string.isRequired,
    columns: PropTypes.arrayOf(PropTypes.shape({ colId: PropTypes.string.isRequired })).isRequired,
  }).isRequired,
  allHidden: PropTypes.bool.isRequired,
  colIds: PropTypes.arrayOf(PropTypes.string).isRequired,
};

/*
Parent-header column picker. Every group carries one, so any single column can be hidden from the
header it sits under. Hiding goes through the grid API rather than through the column definitions,
so a toggle does not rebuild the columns and throw away the user's resizing; `hiddenColumns` is kept
as state only to drive the checkboxes and to seed `hide` when the columns really are rebuilt.

The popover is portalled to the body because the grid header clips its own overflow, which would cut
an inline menu off.
*/
/*
Header of a movable column. AG Grid drags the whole header cell, so the handle is an affordance
rather than the drag source; it is revealed on hover by the stylesheet.
*/
const DraggableHeader = ({ displayName }) => (
  <div className="d-flex align-items-center gap-1 w-100">
    <DragHandle />
    <span className="text-truncate">{displayName}</span>
  </div>
);

DraggableHeader.propTypes = {
  displayName: PropTypes.string.isRequired,
};

const ColumnVisibilityHeader = ({ displayName, columns, movable }) => {
  const { hiddenColumns, setColumnsHidden } = useContext(VariationsGridContext);
  const colIds = columns.map((column) => column.colId);
  const hiddenCount = colIds.filter((colId) => hiddenColumns.includes(colId)).length;

  const popover = (
    <Popover className="reaction-variations-grid__column-picker">
      <Popover.Header as="h3">{displayName}</Popover.Header>
      <Popover.Body>
        <div className="d-flex gap-2 mb-2">
          <Button size="sm" variant="link" className="p-0" onClick={() => setColumnsHidden(colIds, false)}>
            Show all
          </Button>
          <Button size="sm" variant="link" className="p-0" onClick={() => setColumnsHidden(colIds, true)}>
            Hide all
          </Button>
        </div>
        {columns.map((column) => (
          <Form.Check
            key={column.colId}
            type="checkbox"
            id={`toggle-column-${column.colId}`}
            label={column.headerName}
            checked={!hiddenColumns.includes(column.colId)}
            onChange={(event) => setColumnsHidden([column.colId], !event.target.checked)}
          />
        ))}
      </Popover.Body>
    </Popover>
  );

  return (
    <div className="d-flex align-items-center gap-1 w-100">
      {movable && <DragHandle />}
      <span className="text-truncate">{displayName}</span>
      <OverlayTrigger
        trigger="click"
        rootClose
        placement="top-start"
        overlay={popover}
        container={typeof document === 'undefined' ? undefined : document.body}
      >
        <Button
          variant={hiddenCount ? 'warning' : 'light'}
          size="sm"
          className="py-0 px-1"
          title="Show or hide columns"
        >
          <i className="fa fa-columns" aria-hidden="true" />
        </Button>
      </OverlayTrigger>
    </div>
  );
};

ColumnVisibilityHeader.propTypes = {
  displayName: PropTypes.string.isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    colId: PropTypes.string.isRequired,
    headerName: PropTypes.string.isRequired,
  })).isRequired,
  movable: PropTypes.bool.isRequired,
};

const buildColumnGroups = ({
  maxNumberOfSamples, showLoadingColumn, showGasColumns
}) => {
  // The row-level columns are a group of their own so that they get the same per-column picker in
  // their parent header as everything else.
  const groups = [
    {
      groupId: VARIATION_GROUP,
      headerName: 'Variation',
      pinned: 'left',
      // Row identity and the sticky material name belong at the left edge, so these stay put while
      // every other column can be dragged into whatever order suits the comparison.
      fixedPosition: true,
      columns: [
        {
          colId: 'variation_index',
          headerName: '#',
          width: 60,
          valueGetter: ({ data }) => data.label,
          cellClass: 'text-center',
        },
        {
          colId: 'variation_control',
          headerName: 'Control',
          width: 90,
          cellRenderer: OpenVariationCell,
        },
        {
          colId: 'variation_group',
          headerName: 'Group',
          width: 110,
          cellRenderer: GroupCell,
        },
      ],
    },
    /*
    Analyses are a group of their own rather than part of Variation: they get their own header, and
    with it their own column picker and drag handle, so they can be hidden or moved independently.
    */
    {
      groupId: ANALYSES_GROUP,
      headerName: 'Analyses',
      columns: [
        {
          colId: 'variation_analyses',
          headerName: 'Linked analyses',
          width: 140,
          cellRenderer: AnalysesLinkCell,
        },
      ],
    },
  ];

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
          .map((field) => ({
            colId: `${matGroup}_${sampleIdx}_${field.key}`,
            headerName: field.header,
            width: field.width,
            ...(field.sticky ? { cellClass: STICKY_NAME_CLASS } : {}),
            cellRenderer: MaterialFieldCell,
            cellRendererParams: { matGroup, sampleIdx, field },
          })),
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
      cellRenderer: ReactionFieldCell,
      cellRendererParams: { field },
    })),
  });

  return groups;
};

const buildColumnDefs = (columnGroups, hiddenColumns) => columnGroups.map((group) => {
  const movable = !group.fixedPosition;

  return {
    groupId: group.groupId,
    headerName: group.headerName,
    marryChildren: true,
    headerGroupComponent: ColumnVisibilityHeader,
    headerGroupComponentParams: {
      movable,
      columns: group.columns.map(({ colId, headerName }) => ({ colId, headerName })),
    },
    children: group.columns.map((column) => ({
      // A movable column advertises it with a drag handle; the fixed ones keep whatever header they
      // brought along, e.g. the material column's scroll-following name.
      ...(movable ? { headerComponent: DraggableHeader } : {}),
      ...column,
      pinned: group.pinned,
      suppressMovable: !movable,
      lockPosition: movable ? undefined : 'left',
      hide: hiddenColumns.includes(column.colId),
    })),
  };
});

const DEFAULT_COL_DEF = {
  editable: false,
  sortable: false,
  filter: false,
  resizable: true,
  // Columns are draggable; the Variation group opts out per column, see buildColumnGroups.
  autoHeight: true,
  cellStyle: { display: 'flex', alignItems: 'center', overflow: 'visible' },
};

/*
Keeps one ReactionUpdateHandler per variation alive across renders. The handler owns the equivalent
lock state and the debounced mass input, so rebuilding it on every render would defeat both.
*/
const useRowHandlerFactory = (onReactionChange) => {
  const cache = useRef(new Map());
  const onReactionChangeRef = useRef(onReactionChange);

  useEffect(() => {
    onReactionChangeRef.current = onReactionChange;
  }, [onReactionChange]);

  return useCallback((row) => {
    const key = row.data?.id ?? row.idx;
    let entry = cache.current.get(key);

    if (!entry) {
      // Read the row from a ref so a handler built for index 2 keeps reporting the right index
      // after a preceding variation is removed.
      const rowRef = { current: row };
      const handler = new ReactionUpdateHandler({
        reaction: row.data,
        onReactionChange: (updatedReaction) => (
          onReactionChangeRef.current(updatedReaction, rowRef.current.idx)
        ),
        onLockEquivColChange: () => {},
      });
      entry = { handler, rowRef };
      cache.current.set(key, entry);
    } else {
      entry.rowRef.current = row;
      if (entry.handler.reaction !== row.data) {
        entry.handler.reaction = row.data;
      }
    }

    return entry.handler;
  }, []);
};

const VariationSchemaTable = ({
  variations,
  onReactionChange,
  setActiveVariation,
  onGroupChange,
  onDeleteVariation,
  onAnalysesChange,
  allReactionAnalyses,
  reactionShortLabel,
  reactionId,
  editMode
}) => {
  /*
  Seeded from the stored layout so the very first column definitions already carry the right `hide`
  flags; the order is restored from the same state once the grid is ready.
  */
  const [hiddenColumns, setHiddenColumns] = useState(() => (
    (getInitialColumnState(reactionId) ?? [])
      .filter((column) => column.hide)
      .map((column) => column.colId)
  ));
  const [activeSlot, setActiveSlot] = useState(null);
  const [groupOrder, setGroupOrder] = useState([]);
  const gridApiRef = useRef(null);
  const gridElementRef = useRef(null);
  const restoredRef = useRef(false);

  /*
  Mirrors the grid's own top level header order into state, so the toolbar always shows the groups
  in the order they actually appear. The grid stays the single source of truth: both header drags
  and toolbar drags end up here.
  */
  const syncGroupOrder = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) {
      return;
    }

    const groupIds = (api.getAllDisplayedColumnGroups() ?? [])
      .filter((entry) => entry?.isColumn === false && !entry.isPadding?.())
      .map((entry) => entry.getGroupId());

    setGroupOrder((previous) => (
      previous.join('|') === groupIds.join('|') ? previous : groupIds
    ));
  }, []);

  /*
  Lays the groups out left to right by moving each one to a running column index. Groups locked to
  the left are counted but not moved: the grid would refuse anyway, and `syncGroupOrder` then pulls
  the toolbar back in line with what actually happened.
  */
  const applyGroupOrder = useCallback((orderedGroups) => {
    const api = gridApiRef.current;
    if (!api) {
      return;
    }

    let index = 0;
    orderedGroups.forEach((group) => {
      const colIds = group.columns?.map((column) => column.colId) || [];
      if (!group.fixedPosition) {
        api.moveColumns(colIds, index);
      }
      index += colIds.length;
    });
  }, []);
  const getRowHandler = useRowHandlerFactory(onReactionChange);

  /*
  Applies the change through the grid API so the columns are not rebuilt, and mirrors it into state
  so the pickers stay in sync and a later structural rebuild keeps the same columns hidden.
  */
  const setColumnsHidden = useCallback((colIds, hidden) => {
    gridApiRef.current?.setColumnsVisible(colIds, !hidden);
    setHiddenColumns((previous) => {
      const next = new Set(previous);
      colIds.forEach((colId) => (hidden ? next.add(colId) : next.delete(colId)));
      return [...next];
    });
  }, []);

  /*
  Resolves which material group sits at the left edge of the scrolled area, which is what the pinned
  material column renders. Bails out by returning the previous state when the slot has not changed,
  so a scroll gesture triggers at most one re-render per group crossed.
  */
  /*
  Keeps each material's name cell at the left edge of the scrolled area for as long as its own group
  is on screen, then lets it scroll away with the group.

  AG Grid absolutely positions cells and sets their `left` inline, so `position: sticky` on the cell
  cannot work: it would drop out of that positioning, land at the row's left edge, and clamp against
  the whole row rather than its group. Translating the very same cell div is the equivalent that
  survives AG Grid's layout, and it is done imperatively because doing it through React state would
  re-render every cell of the grid on every scroll frame.
  */
  const updateStickyNames = useCallback(() => {
    const api = gridApiRef.current;
    const root = gridElementRef.current;
    if (!api || !root) {
      return;
    }

    const { left: scrollLeft } = api.getHorizontalPixelRange();

    root.querySelectorAll(`.ag-center-cols-container .${STICKY_NAME_CLASS}`).forEach((cell) => {
      const column = api.getColumn(cell.getAttribute('col-id'));
      if (!column) {
        return;
      }

      const columnLeft = column.getLeft() ?? 0;
      const columnRight = columnLeft + column.getActualWidth();
      const leaves = column.getParent()?.getDisplayedLeafColumns() ?? [];
      const lastLeaf = leaves[leaves.length - 1];
      const groupRight = lastLeaf
        ? (lastLeaf.getLeft() ?? 0) + lastLeaf.getActualWidth()
        : columnRight;

      // Never travel beyond the group: at its right edge the name goes out of view with it.
      const offset = Math.min(
        Math.max(scrollLeft - columnLeft, 0),
        Math.max(groupRight - columnRight, 0)
      );

      cell.style.transform = offset ? `translateX(${offset}px)` : '';
      cell.classList.toggle(STICKY_NAME_FLOATING_CLASS, offset > 0);
    });
  }, []);

  const syncActiveSlot = useCallback(() => {
    const api = gridApiRef.current;
    if (!api) {
      return;
    }

    const { left } = api.getHorizontalPixelRange();
    /*
    The name describes whatever sits at the left edge of the scrolled area. Anything that is not a
    material group there - Analyses, Reaction, or AG Grid's own padding groups - means there is no
    material to name, and the pinned column hides itself rather than naming some other material
    further to the right.
    */
    const firstVisible = api.getDisplayedCenterColumns().find(
      (column) => (column.getLeft() ?? 0) + column.getActualWidth() > left + 1
    );
    const parentGroupId = firstVisible?.getParent()?.getGroupId() ?? null;
    const groupId = parentGroupId?.includes(GROUP_ID_SEPARATOR) ? parentGroupId : null;

    setActiveSlot((previous) => {
      if (!groupId) {
        return previous === null ? previous : null;
      }
      if (previous && `${previous.matGroup}${GROUP_ID_SEPARATOR}${previous.sampleIdx}` === groupId) {
        return previous;
      }
      const [matGroup, sampleIdx] = groupId.split(GROUP_ID_SEPARATOR);
      return { matGroup, sampleIdx: Number(sampleIdx) };
    });
  }, []);

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

  const columnGroups = buildColumnGroups({
    maxNumberOfSamples, showLoadingColumn, showGasColumns
  });

  /*
  The pinned material column only ever shows the material of the slot currently at the left edge, so
  it is dead weight when there is no such slot - scrolled past the materials, or every material
  group hidden - or when no variation has a material in it. Hidden on top of the user's own choice
  rather than instead of it, so unhiding it from the picker still works once there is something to
  show again.
  */
  // Nothing is hidden automatically any more: the pinned material column that used to hide itself
  // when no material was in view has been replaced by the sticky name cells.
  const effectiveHiddenColumns = hiddenColumns;

  /*
  Keyed on the column layout only, deliberately not on `hiddenColumns`: visibility is applied via
  the grid API, so folding it in here would rebuild every column on each toggle.
  */
  const columnSignature = columnGroups
    .map((group) => `${group.groupId}[${group.columns.map((column) => column.colId).join(',')}]`)
    .join('|');

  const columnDefs = useMemo(
    () => buildColumnDefs(columnGroups, effectiveHiddenColumns),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnSignature]
  );

  // Writes order, widths and hidden columns back to storage.
  const saveColumnState = () => {
    const api = gridApiRef.current;
    if (!api || !restoredRef.current) {
      return;
    }

    persistColumnState(reactionId, api.getColumnState());
  };

  // Visibility changes settle in state, so they are persisted from here rather than from the grid's
  // visibility event, which fires before `hiddenColumns` has caught up.
  useEffect(() => {
    saveColumnState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenColumns]);

  /*
  Toolbar order follows the grid, with any fully hidden group appended: AG Grid drops a group from
  the header once nothing under it is displayed, and the toolbar is the only way back for those.
  */
  const groupsById = Object.fromEntries(columnGroups.map((group) => [group.groupId, group]));
  const orderedGroups = [
    ...groupOrder.map((groupId) => groupsById[groupId]).filter(Boolean),
    ...columnGroups.filter((group) => !groupOrder.includes(group.groupId)),
  ];
  const fixedGroups = orderedGroups.filter((group) => group.fixedPosition);
  const movableGroups = orderedGroups.filter((group) => !group.fixedPosition);

  // See VariationsGridContext: intentionally a fresh object on every render.
  const gridContext = {
    getRowHandler,
    setActiveVariation,
    onGroupChange,
    onDeleteVariation,
    onAnalysesChange,
    allReactionAnalyses,
    reactionShortLabel,
    activeSlot,
    hiddenColumns,
    setColumnsHidden
  };

  const getGroupAllHidden = (group) => {
    const colIds = group.columns.map((column) => column.colId);
    const allHidden = colIds.length > 0 && colIds.every((colId) => hiddenColumns.includes(colId));
    return { allHidden, colIds };
  };

  const movableGroupsAdvanced = movableGroups.map((group) => ({ group, ...getGroupAllHidden(group) }));
  const fixedGroupsAdvanced = fixedGroups.map((group) => ({ group, ...getGroupAllHidden(group) }));

  return (
    <VariationsGridContext.Provider value={gridContext}>
      {}
      { editMode &&
      <div className="reaction-variations-grid__toolbar d-flex align-items-center flex-wrap gap-2 mb-2">
        {fixedGroupsAdvanced.map(({ group, allHidden, colIds }) => (
          <GroupToggleButton key={group.groupId} group={group} allHidden={allHidden} colIds={colIds} />
        ))}

        <ReorderableList
          horizontal
          items={movableGroupsAdvanced.filter(({ allHidden }) => !allHidden)}
          getItemId={(group) => group.groupId}
          onReorder={(reordered) => applyGroupOrder([...fixedGroups, ...reordered.map(({ group }) => group)])}
          renderItem={({ group, allHidden, colIds }) =>
            <GroupToggleButton group={group}  allHidden={allHidden} colIds={colIds} />}
        />

        {movableGroupsAdvanced.filter(({ allHidden }) => allHidden).map(({ group, allHidden, colIds }) => (
          <GroupToggleButton key={group.groupId} group={group} allHidden={allHidden} colIds={colIds} />
        ))}
      </div>
      }
      <div className="ag-theme-alpine reaction-variations-grid" ref={gridElementRef}>
        <AgGridReact
          columnDefs={columnDefs}
          // Fresh array so an added or removed variation is picked up even though the parent
          // mutates the same array in place. `getRowId` makes AG Grid diff by id, so untouched
          // rows keep their nodes and their cells are left alone.
          rowData={[...variations]}
          getRowId={({ data }) => String(data.data?.id ?? data.idx)}
          defaultColDef={DEFAULT_COL_DEF}
          domLayout="autoHeight"
          headerHeight={32}
          groupHeaderHeight={32}
          suppressCellFocus
          // Keeps a user's drag order when the columns are rebuilt for a structural reason, e.g. a
          // material being added, instead of snapping back to the order of the definitions.
          maintainColumnOrder
          // Dragging a column off the grid would hide it behind the pickers' backs, leaving the
          // checkboxes claiming it is visible. Hiding stays the pickers' job.
          suppressDragLeaveHidesColumns
          // The sticky name cell must survive being scrolled out of the rendered column window,
          // otherwise AG Grid destroys it halfway through its own group.
          suppressColumnVirtualisation
          onGridReady={({ api }) => {
            gridApiRef.current = api;
            const storedState = getInitialColumnState(reactionId);
            if (storedState?.length) {
              api.applyColumnState({ state: storedState, applyOrder: true });
            }
            // Only from here on may events overwrite what was just loaded.
            restoredRef.current = true;
            syncActiveSlot();
            syncGroupOrder();
            updateStickyNames();
          }}
          onFirstDataRendered={() => {
            syncActiveSlot();
            updateStickyNames();
          }}
          onBodyScroll={() => {
            syncActiveSlot();
            updateStickyNames();
          }}
          onModelUpdated={updateStickyNames}
          onVirtualColumnsChanged={() => {
            syncActiveSlot();
            updateStickyNames();
          }}
          onColumnResized={({ finished }) => {
            syncActiveSlot();
            updateStickyNames();
            if (finished) {
              saveColumnState();
            }
          }}
          onColumnPinned={saveColumnState}
          onColumnMoved={() => {
            syncActiveSlot();
            syncGroupOrder();
            updateStickyNames();
            saveColumnState();
          }}
          onDisplayedColumnsChanged={syncGroupOrder}
        />
      </div>
    </VariationsGridContext.Provider>
  );
};

VariationSchemaTable.propTypes = {
  editMode: PropTypes.bool.isRequired,
  variations: PropTypes.arrayOf(PropTypes.shape({
    idx: PropTypes.number.isRequired,
    group: PropTypes.arrayOf(
      PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    ).isRequired,
    data: PropTypes.instanceOf(Reaction).isRequired,
  })).isRequired,
  onReactionChange: PropTypes.func.isRequired,
  setActiveVariation: PropTypes.func.isRequired,
  onGroupChange: PropTypes.func.isRequired,
  onDeleteVariation: PropTypes.func.isRequired,
  onAnalysesChange: PropTypes.func.isRequired,
  allReactionAnalyses: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
  })).isRequired,
  reactionShortLabel: PropTypes.string,
  reactionId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};

VariationSchemaTable.defaultProps = {
  reactionShortLabel: '',
};

export default VariationSchemaTable;
