import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState
} from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import {
  Button, ButtonGroup, Form, InputGroup
} from 'react-bootstrap';
import Reaction from 'src/models/Reaction';
import { permitOn } from 'src/components/common/uis';
import ReactionUpdateHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import { MATERIAL_HEADER } from 'src/apps/mydb/elements/details/reactions/schemeTab/MaterialGroup';
import {
  CoefficientField,
  DrySolventCheckBox,
  EquivalentOrYield,
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
  render: (mh, { index }) => (
    <MaterialNameWithIupac mh={mh} index={index} withStickyName={false} />
  ),
};

/*
One entry per grid column. `render` is handed a MaterialHandler bound to the material of that row,
so every column reuses the very same input component the scheme tab renders.
*/
const GENERAL_MATERIAL_FIELDS = [
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
  },
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

const FIELDS_BY_GROUP = {
  starting_materials: GENERAL_MATERIAL_FIELDS,
  reactants: GENERAL_MATERIAL_FIELDS,
  products: GENERAL_MATERIAL_FIELDS,
  solvents: SOLVENT_FIELDS,
};

/*
Renders a single input of a single material. `matGroup`/`sampleIdx`/`field` are fixed per column,
the row supplies the variation reaction.
*/
const MaterialFieldCell = ({
  data, matGroup, sampleIdx, field
}) => {
  const { getRowHandler } = useContext(VariationsGridContext);
  const variationReaction = data?.data ?? null;
  const material = variationReaction?.[matGroup]?.[sampleIdx] ?? null;

  // Only the equivalent/weight-percentage selector reads this, and it is per material, so cell-local
  // state is the right scope for it.
  const [fieldToShow, setFieldToShow] = useState(
    () => (material && !isEmptyValue(material.weight_percentage) ? 'weight percentage' : 'molar mass')
  );

  const rowHandler = variationReaction ? getRowHandler(data) : null;
  // Read as a dependency rather than only inside the factory, so a change of the equivalent lock
  // rebuilds the handler instead of leaving the disabled states stale.
  const lockEquivColumn = rowHandler ? rowHandler.lockEquivColumn : false;

  const mh = useMemo(() => {
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

  if (!mh) {
    return null;
  }

  return field.render(mh, {
    index: sampleIdx + 1,
    showLoadingColumn: !!variationReaction.hasPolymers(),
    displayYieldField: variationReaction.products.every(
      (product) => !(product.conversion_rate && product.conversion_rate !== 0)
    ),
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

const OpenVariationCell = ({ data }) => {
  const { setActiveVariation } = useContext(VariationsGridContext);

  return (
    <Button
      variant="info"
      size="sm"
      type="button"
      onClick={() => setActiveVariation({ idx: data.idx, data: data.data })}
    >
      Open
    </Button>
  );
};

OpenVariationCell.propTypes = {
  data: PropTypes.shape({
    idx: PropTypes.number.isRequired,
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

const buildColumnDefs = ({ maxNumberOfSamples, hiddenGroups, showLoadingColumn }) => {
  const columnDefs = [
    {
      colId: 'variation_index',
      headerName: '#',
      pinned: 'left',
      width: 60,
      valueGetter: ({ data }) => data.idx,
      cellClass: 'text-center',
    },
    {
      colId: 'variation_control',
      headerName: 'Control',
      pinned: 'left',
      width: 90,
      cellRenderer: OpenVariationCell,
    },
    {
      colId: 'variation_group',
      headerName: 'Group',
      pinned: 'left',
      width: 110,
      cellRenderer: GroupCell,
    },
  ];

  MAT_GROUPS.forEach((matGroup) => {
    const numberOfSamples = maxNumberOfSamples[matGroup] || 0;
    const fields = FIELDS_BY_GROUP[matGroup];

    for (let sampleIdx = 0; sampleIdx < numberOfSamples; sampleIdx += 1) {
      columnDefs.push({
        groupId: `${matGroup}_${sampleIdx}`,
        headerName: `${MAT_GROUP_TITLES[matGroup]} ${sampleIdx + 1}`,
        marryChildren: true,
        children: fields
          .filter((field) => !field.requiresLoadingColumn || showLoadingColumn)
          .map((field) => ({
            colId: `${matGroup}_${sampleIdx}_${field.key}`,
            headerName: field.header,
            width: field.width,
            hide: hiddenGroups.includes(matGroup),
            cellRenderer: MaterialFieldCell,
            cellRendererParams: { matGroup, sampleIdx, field },
          })),
      });
    }
  });

  return columnDefs;
};

const DEFAULT_COL_DEF = {
  editable: false,
  sortable: false,
  filter: false,
  resizable: true,
  suppressMovable: true,
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
  onGroupChange
}) => {
  const [hiddenGroups, setHiddenGroups] = useState([]);
  const getRowHandler = useRowHandlerFactory(onReactionChange);

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

  const columnSignature = [
    ...MAT_GROUPS.map((matGroup) => `${matGroup}:${maxNumberOfSamples[matGroup]}`),
    `loading:${showLoadingColumn}`,
    `hidden:${[...hiddenGroups].sort().join(',')}`,
  ].join('|');

  const columnDefs = useMemo(
    () => buildColumnDefs({ maxNumberOfSamples, hiddenGroups, showLoadingColumn }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnSignature]
  );

  const toggleGroup = (matGroup) => setHiddenGroups((previous) => (
    previous.includes(matGroup)
      ? previous.filter((group) => group !== matGroup)
      : [...previous, matGroup]
  ));

  // See VariationsGridContext: intentionally a fresh object on every render.
  const gridContext = { getRowHandler, setActiveVariation, onGroupChange };

  return (
    <VariationsGridContext.Provider value={gridContext}>
      <ButtonGroup className="mb-2">
        {MAT_GROUPS.filter((matGroup) => maxNumberOfSamples[matGroup] > 0).map((matGroup) => (
          <Button
            key={`toggle-${matGroup}`}
            size="sm"
            variant={hiddenGroups.includes(matGroup) ? 'outline-info' : 'info'}
            onClick={() => toggleGroup(matGroup)}
          >
            <i
              className={hiddenGroups.includes(matGroup) ? 'fa fa-eye me-1' : 'fa fa-eye-slash me-1'}
              aria-hidden="true"
            />
            {MAT_GROUP_TITLES[matGroup]}
          </Button>
        ))}
      </ButtonGroup>
      <div className="ag-theme-alpine reaction-variations-grid">
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
        />
      </div>
    </VariationsGridContext.Provider>
  );
};

VariationSchemaTable.propTypes = {
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
};

export default VariationSchemaTable;
