/* eslint-disable react/display-name */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, useState, useCallback, useReducer, useEffect, useMemo,
} from 'react';
import {
  Button, OverlayTrigger, Tooltip, Alert,
  ButtonGroup, Modal,
} from 'react-bootstrap';
import { cloneDeep, isEqual } from 'lodash';
import PropTypes from 'prop-types';
import Reaction from 'src/models/Reaction';
import {
  createVariationsRow, copyVariationsRow, updateVariationsRow, getVariationsColumns, materialTypes,
  addMissingColumnsToVariations, removeObsoleteColumnsFromVariations, getColumnDefinitions, getSegmentsForVariations,
  removeObsoleteColumnDefinitions, getInitialGridState, persistGridState,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReactionAnalyses, updateAnalyses,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import {
  updateVariationsAux, getReactionMaterials, getReactionMaterialsIDs,
  removeObsoleteMaterialColumns, resetColumnDefinitionsMaterials, getReactionMaterialsHashes
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  PropertyFormatter, PropertyParser,
  MaterialFormatter, MaterialParser,
  EquivalentParser, GasParser, FeedstockParser,
  ColumnSelection, toUpperCase, SegmentFormatter, SegmentParser,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import columnDefinitionsReducer
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsReducers';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';

let processedSegs = null;

export default function ReactionVariations({ reaction, onReactionChange, isActive }) {
  if (reaction.isNew) {
    return (
      <Alert variant="info">
        Save the reaction to enable the variations tab.
      </Alert>
    );
  }

  const gridRef = useRef(null);
  const reactionVariations = reaction.variations;
  const reactionHasPolymers = reaction.hasPolymers();
  const reactionShortLabel = reaction.short_label;
  const reactionMaterials = getReactionMaterials(reaction);
  const [previousReactionMaterials, setPreviousReactionMaterials] = useState(reactionMaterials);
  const gasMode = reaction.gaseous;
  const [previousGasMode, setPreviousGasMode] = useState(gasMode);
  const allReactionAnalyses = getReactionAnalyses(reaction);
  const [previousAllReactionAnalyses, setPreviousAllReactionAnalyses] = useState(allReactionAnalyses);
  const { dispValue: durationValue = null, dispUnit: durationUnit = 'None' } = reaction.durationDisplay ?? {};
  const { userText: temperatureValue = null, valueUnit: temperatureUnit = 'None' } = reaction.temperature ?? {};
  const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
  const [selectedColumns, setSelectedColumns] = useState(getVariationsColumns(reactionVariations));
  const [columnDefinitions, setColumnDefinitions] = useReducer(columnDefinitionsReducer, {});
  const initialGridState = useMemo(() => getInitialGridState(reaction.id), []);

    useEffect(() => {
    // Fetch data only once when component mounts
    const fetchData = async () => {
      try {
        processedSegs = await getSegmentsForVariations(reaction);
        const initialColumnDefinitions = getColumnDefinitions(selectedColumns, reactionMaterials, gasMode);
        setColumnDefinitions({
          type: 'set_column_definitions',
          columnDefinitions: initialColumnDefinitions,
        });
      } catch (error) {
        console.error('Error fetching segments:', error);
      }
    };

    if (processedSegs === null) {
      fetchData();
    }
  }, []);

  const dataTypeDefinitions = {
    property: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: PropertyFormatter,
      valueParser: PropertyParser,
    },
    segmentData: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: SegmentFormatter,
      valueParser: SegmentParser,
    },
    material: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: MaterialFormatter,
      valueParser: MaterialParser,
    },
    equivalent: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: (params) => parseFloat(Number(params.value.equivalent.value)
        .toPrecision(4)),
      valueParser: EquivalentParser,
    },
    yield: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: (params) => parseFloat(Number(params.value.yield.value)
        .toPrecision(4)),
    },
    gas: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: MaterialFormatter,
      valueParser: GasParser,
    },
    feedstock: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: MaterialFormatter,
      valueParser: FeedstockParser,
    },
  };

  const defaultColumnDefinitions = {
    editable: true,
    sortable: true,
    resizable: false,
  };

  useEffect(() => {
    // Auto-size columns when the parent tab is (re-)entered.
    if (isActive && gridRef.current?.api) {
      gridRef.current.api.autoSizeAllColumns();
    }
  }, [isActive]);

  const setReactionVariations = (updatedReactionVariations) => {
    // eslint-disable-next-line no-param-reassign
    reaction.variations = updatedReactionVariations;
    onReactionChange(reaction);
  };

  /*
  What follows is a series of imperative state updates that keep the "Variations" tab in sync with the "Scheme" tab.
  This pattern isn't nice, but the best I could do according to
  https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes and
  https://react.dev/reference/react/useState#storing-information-from-previous-renders.
  It would be preferable to refactor this to a more declarative approach, using a store for example.
  */

  /*
  Update materials according to "Scheme" tab.
  */
  if (!isEqual(
    getReactionMaterialsHashes(reactionMaterials, gasMode, vesselVolume),
    getReactionMaterialsHashes(previousReactionMaterials, gasMode, vesselVolume)
  )) {
    /*
    Keep set of materials up-to-date.
    Materials could have been added or removed in the "Scheme" tab.
    We need to only *remove* obsolete materials, not *add* missing ones, since users add materials manually.
    */
    const updatedSelectedColumns = removeObsoleteMaterialColumns(
      reactionMaterials,
      selectedColumns
    );

    let updatedReactionVariations = removeObsoleteColumnsFromVariations(
      reactionVariations,
      updatedSelectedColumns,
    );

    let updatedColumnDefinitions = removeObsoleteColumnDefinitions(columnDefinitions, updatedSelectedColumns);

    /*
    Update the materials' non-editable quantities according to the "Scheme" tab.
    */
    updatedReactionVariations = updateVariationsAux(
      updatedReactionVariations,
      reactionMaterials,
      gasMode,
      vesselVolume
    );

    // Reset materials' column definitions to account for potential changes in their gas type.
    updatedColumnDefinitions = resetColumnDefinitionsMaterials(
      updatedColumnDefinitions,
      reactionMaterials,
      updatedSelectedColumns,
      gasMode
    );

    setColumnDefinitions(
      {
        type: 'set_updated',
        update: updatedColumnDefinitions
      }
    );
    setSelectedColumns(updatedSelectedColumns);
    setReactionVariations(updatedReactionVariations);
    setPreviousReactionMaterials(reactionMaterials);
    setPreviousGasMode(gasMode);
  }

  /*
  Update gas mode according to "Scheme" tab.
  */
  if (gasMode !== previousGasMode) {
    const updatedSelectedColumns = getVariationsColumns([]);
    setSelectedColumns(updatedSelectedColumns);
    setColumnDefinitions(
      {
        type: 'toggle_gas_mode',
        materials: Object.keys(materialTypes)
          .reduce((materials, materialType) => {
            // eslint-disable-next-line no-param-reassign
            materials[materialType] = [];
            return materials;
          }, {}),
        selectedColumns: updatedSelectedColumns,
        gasMode
      }
    );
    setPreviousGasMode(gasMode);
    setReactionVariations([]);
  }

  /*
  The "Variations" tab holds references to analyses in the "Analyses" tab.
  Users can add, remove, or edit analyses in the "Analyses" tab.
  Every analysis in the "Analyses" tab can be assigned to one or more rows in the "Variations" tab.
  Each row in the variations table keeps references to its assigned analyses
  by tracking the corresponding `analysesIDs`.
  In the example below, variations row "A" keeps a reference to `analysesIDs` "1",
  whereas variations row "C" keeps references to "1" and "3".
  The set of all `analysesIDs` that are referenced by variations is called `referenceIDs`.

  Figure 1
  Analyses tab  Variations tab
  .---.         .---------.
  | 1 |<--------| A: 1    |
  |---|     \   |---------|
  | 2 |      \  | B:      |
  |---|       \ |---------|
  | 3 |<-------\| C: 1, 3 |
  |---|         `---------`
  | 4 |
  `---`

  The table below shows how to keep the state consistent across the "Analyses" tab and "Variations" tab.
  "X" denotes absence of ID.

  Table 1
  .-------------- ---------------- -------------------------------------------------.
  | Analyses tab  | Variations tab | action                                         |
  | (analysesIDs) | (referenceIDs) |                                                |
  |-------------- |--------------- |----------------------------------------------- |
  | ID            | ID             | None                                           |
  |-------------- |--------------- |----------------------------------------------- |
  | X             | ID             | Container with ID removed in "Analyses" tab.   |
  |               |                | Remove ID from `referenceIDs`.                 |
  |-------------- |--------------- |----------------------------------------------- |
  | ID            | X              | Row that's tracking ID removed in "Variations" |
  |               |                | tab. No action required since "Analyses" tab   |
  |               |                | only displays associations to existing rows.   |
  `-------------- ---------------- -------------------------------------------------`
  */
  if (!isEqual(allReactionAnalyses, previousAllReactionAnalyses)) {
    const updatedReactionVariations = updateAnalyses(reactionVariations, allReactionAnalyses);
    setReactionVariations(updatedReactionVariations);
    setPreviousAllReactionAnalyses(allReactionAnalyses);
  }

  const addRow = () => {
    setReactionVariations(
      [
        ...reactionVariations,
        createVariationsRow(
          {
            materials: reactionMaterials,
            selectedColumns,
            variations: reactionVariations,
            reactionHasPolymers,
            durationValue,
            durationUnit,
            temperatureValue,
            temperatureUnit,
            gasMode,
            vesselVolume,
          },
        ),
      ],
    );
  };

  const copyRow = useCallback((data) => {
    const copiedRow = copyVariationsRow(data, reactionVariations);
    setReactionVariations(
      [...reactionVariations, copiedRow],
    );
  }, [reactionVariations]);

  const removeRow = useCallback((data) => {
    setReactionVariations(reactionVariations.filter((row) => row.id !== data.id));
  }, [reactionVariations]);

  const updateRow = useCallback(({
    data: oldRow,
    colDef,
    newValue,
  }) => {
    const { field } = colDef;
    const updatedRow = updateVariationsRow(oldRow, field, newValue, reactionHasPolymers);
    setReactionVariations(
      reactionVariations.map((row) => (row.id === oldRow.id ? updatedRow : row)),
    );
  }, [reactionVariations, reactionHasPolymers]);

  const applyColumnSelection = (columns) => {
    let updatedReactionVariations = addMissingColumnsToVariations({
      materials: reactionMaterials,
      selectedColumns: columns,
      variations: reactionVariations,
      reactionHasPolymers,
      durationValue,
      durationUnit,
      temperatureValue,
      temperatureUnit,
      gasMode,
      vesselVolume,
    });
    updatedReactionVariations = removeObsoleteColumnsFromVariations(
      updatedReactionVariations,
      columns,
    );
    setReactionVariations(updatedReactionVariations);

    setColumnDefinitions(
      {
        type: 'apply_column_selection',
        materials: reactionMaterials,
        selectedColumns: columns,
        gasMode,
      },
    );

    setSelectedColumns(columns);
  };

  const removeAllVariations = () => {
    const [showModal, setShowModal] = useState(false);

    const handleClose = () => setShowModal(false);
    const handleShow = () => setShowModal(true);
    const handleConfirm = () => {
      setReactionVariations([]);
      handleClose();
    };

    return (
      <>
        <Button size="sm" variant="danger" onClick={handleShow} className="mb-2">
          <i className="fa fa-trash me-1"/>
          {' '}
          Remove all variations
        </Button>

        <Modal show={showModal} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Removal</Modal.Title>
          </Modal.Header>
          <Modal.Body>Are you sure you want to remove all variations?</Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Keep variations
            </Button>
            <Button variant="danger" onClick={handleConfirm}>
              Remove variations
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  };

  const columnSelectControl = () => {
    const availableColumns = {
      segmentData: (processedSegs ?? []).map((a) => [a.key, a.label, a.group]),
      ...getReactionMaterialsIDs(reactionMaterials),
      properties: ['duration', 'temperature'].map((x) => [x, toUpperCase(x)]),
      metadata: ['notes', 'analyses'].map((x) => [x, toUpperCase(x)]),
    };

    return ColumnSelection(
      selectedColumns,
      availableColumns,
      applyColumnSelection,
      processedSegs === null,
    );
  };

  const addVariation = () => (
    <OverlayTrigger
      placement="bottom"
      overlay={(
        <Tooltip>
          Add row with current data from &quot;Scheme&quot; tab.
          <br/>
          Changes in &quot;Scheme&quot; tab are not applied to
          {' '}
          <i>existing</i>
          {' '}
          rows.
        </Tooltip>
      )}
    >
      <Button size="sm" variant="success" onClick={addRow} className="mb-2">
        <i className="fa fa-plus me-1"/>
        {' '}
        Add variation
      </Button>
    </OverlayTrigger>
  );

  const fitColumnToContent = (event) => {
    const { column } = event;
    gridRef.current.api.autoSizeColumns([column], false);
  };

  function mainGrid() {
    if (Object.keys(columnDefinitions).length > 0) {
      const reducedColumnDefinitions = columnDefinitions.reduce((acc, x) => {
        if (x.headerName === 'Segments') {
          x.children.reduce((kc, ch) => kc.add(ch.field.split('___')[0].slice('segmentData.'.length)), new Set())
            .forEach((c) => {
              const newX = cloneDeep(x);
              newX.headerName = c;
              newX.children = newX.children.filter((newCh) => newCh.field.startsWith(`segmentData.${c}`));
              acc.push(newX);
            });
        } else {
          acc.push(x);
        }
        return acc;
      }, []);
      return (
        <AgGridReact
          ref={gridRef}
          initialState={initialGridState}
          rowData={reactionVariations}
          rowDragEntireRow
          rowDragManaged
          headerHeight={70}
          columnDefs={reducedColumnDefinitions}
          suppressPropertyNamesCheck
          defaultColDef={defaultColumnDefinitions}
          dataTypeDefinitions={dataTypeDefinitions}
          tooltipShowDelay={0}
          domLayout="autoHeight"
          maintainColumnOrder
          context={{
            copyRow,
            removeRow,
            setColumnDefinitions,
            reactionHasPolymers,
            reactionShortLabel,
            allReactionAnalyses,
          }}
          /*
          IMPORTANT: In conjunction with `onCellEditRequest`,
          `readOnlyEdit` ensures that all edits of `reaction.variations` go through `updateRow`,
          rather than the grid mutating `reaction.variations` directly on user edits.
          I.e., we take explicit control of state manipulation.
          */
          readOnlyEdit
          onCellEditRequest={updateRow}
          onCellValueChanged={(event) => fitColumnToContent(event)}
          onColumnHeaderClicked={(event) => fitColumnToContent(event)}
          onGridPreDestroyed={(event) => persistGridState(reaction.id, event)}
          onStateUpdated={(event) => persistGridState(reaction.id, event)}
        />
      );
    }

    return (<p>Loading...</p>);
  }

  return (
    <div>
      <ButtonGroup>
        {addVariation()}
        {removeAllVariations()}
        {columnSelectControl()}
      </ButtonGroup>
      <div className="ag-theme-alpine ag-theme-reaction-variations">
        {mainGrid()}
      </div>
    </div>
  );
}

ReactionVariations.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
  isActive: PropTypes.bool.isRequired,
};
