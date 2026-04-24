/* eslint-disable react/display-name */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, useState, useCallback, useReducer, useEffect, useMemo
} from 'react';
import {
  Button, OverlayTrigger, Tooltip, Alert,
  ButtonGroup
} from 'react-bootstrap';
import { isEqual } from 'lodash';
import PropTypes from 'prop-types';
import Reaction from 'src/models/Reaction';
import {
  createVariationsRow, copyVariationsRow, updateVariationsRow, getVariationsColumns, materialTypes,
  addMissingColumnsToVariations, removeObsoleteColumnsFromVariations, getColumnDefinitions,
  removeObsoleteColumnDefinitions, getInitialGridState, persistRowOrder, setRowOrder,
  setLayout, persistTableLayout, cellDataTypes,
  getReactionSegments,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReactionAnalyses, updateAnalyses
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import {
  updateVariationsOnAuxChange, getReactionMaterials, getReactionMaterialsIDsToLabels,
  removeObsoleteMaterialColumns, updateColumnDefinitionsMaterialsOnAuxChange, getReactionMaterialsHashes
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  ColumnSelection,
  RemoveVariationsModal
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import columnDefinitionsReducer
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsReducers';
import GasPhaseReactionStore from 'src/stores/alt/stores/GasPhaseReactionStore';

export default function ReactionVariations({ reaction, onReactionChange }) {
  if (reaction.isNew) {
    return (
      <Alert variant="info">
        Save the reaction to enable the variations tab.
      </Alert>
    );
  }

  const gridRef = useRef(null);
  const pendingReactionVariations = useRef(null);
  const reactionVariations = reaction.variations;
  const setReactionVariations = useCallback((updatedReactionVariations) => {
    reaction.variations = updatedReactionVariations;
    onReactionChange(reaction);
  }, [reaction, onReactionChange]);
  const reactionHasPolymers = reaction.hasPolymers();
  const reactionShortLabel = reaction.short_label;
  const reactionMaterials = getReactionMaterials(reaction);
  const [previousReactionMaterials, setPreviousReactionMaterials] = useState(reactionMaterials);
  const [reactionSegments, setReactionSegments] = useState(new Map());
  const gasMode = reaction.gaseous;
  const [previousGasMode, setPreviousGasMode] = useState(gasMode);
  const allReactionAnalyses = getReactionAnalyses(reaction);
  const [previousAllReactionAnalyses, setPreviousAllReactionAnalyses] = useState(allReactionAnalyses);
  const { dispValue: durationValue = null, dispUnit: durationUnit = 'None' } = reaction.durationDisplay ?? {};
  const { userText: temperatureValue = null, valueUnit: temperatureUnit = 'None' } = reaction.temperature ?? {};
  const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;
  const [selectedColumns, setSelectedColumns] = useState(getVariationsColumns(reactionVariations));
  const [columnDefinitions, setColumnDefinitions] = useReducer(columnDefinitionsReducer, []);
  const initialGridState = useMemo(() => getInitialGridState(reaction.id), []);
  const [asyncDataLoaded, setAsyncDataLoaded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const segments = await getReactionSegments(reaction);
      const updatedSelectedColumns = {
        ...selectedColumns, segments: selectedColumns.segments.filter((segment) => Object.hasOwn(segments, segment))
      };
      let updatedReactionVariations = removeObsoleteColumnsFromVariations(reactionVariations, updatedSelectedColumns);
      let updatedColumnDefinitions = getColumnDefinitions(
        updatedSelectedColumns,
        reactionMaterials,
        segments,
        gasMode,
      );
      updatedColumnDefinitions = setLayout(reaction.id, updatedColumnDefinitions);
      updatedReactionVariations = setRowOrder(reaction.id, updatedReactionVariations);

      setReactionSegments(segments);
      setSelectedColumns(updatedSelectedColumns);
      setReactionVariations(updatedReactionVariations);
      setColumnDefinitions({ type: 'set_updated', update: updatedColumnDefinitions });
      setAsyncDataLoaded(true);
    };
    fetchData();
  }, []);

  const handleRowDrag = (event) => {
    const rowOrder = [];
    event.api.forEachNode((node) => rowOrder.push(node.data.id));

    persistRowOrder(reaction.id, rowOrder);
    const reorderedVariations = rowOrder
      .map((id) => reactionVariations.find((row) => row.id === id))
      .filter(Boolean);
    setReactionVariations(reorderedVariations);
  };

  const addRow = () => {
    setReactionVariations(
      [
        ...reactionVariations,
        createVariationsRow(
          {
            materials: reactionMaterials,
            segments: reactionSegments,
            selectedColumns,
            variations: reactionVariations,
            reactionHasPolymers,
            durationValue,
            durationUnit,
            temperatureValue,
            temperatureUnit,
            gasMode,
            vesselVolume
          }
        )
      ]
    );
  };

  const copyRow = useCallback((data) => {
    const copiedRow = copyVariationsRow(data, reactionVariations);
    setReactionVariations(
      [...reactionVariations, copiedRow]
    );
  }, [reactionVariations]);

  const removeRow = useCallback((data) => {
    setReactionVariations(reactionVariations.filter((row) => row.id !== data.id));
  }, [reactionVariations]);

  const updateRow = useCallback(({ data: oldRow, colDef, newValue }) => {
    const { field } = colDef;
    const updatedRow = updateVariationsRow(oldRow, field, newValue, reactionHasPolymers);
    const updatedPendingReactionVariations = pendingReactionVariations.current ?? reactionVariations;
    pendingReactionVariations.current = updatedPendingReactionVariations.map(
      (row) => (row.id === oldRow.id ? updatedRow : row)
    );
    gridRef.current.api.applyTransaction({ update: [updatedRow] });
  }, [reactionVariations, reactionHasPolymers]);

  const handleCellEditingStopped = useCallback((event) => {
    /*
    Defer setReactionVariations until all cell editing has stopped.
    Without deferring, ongoing edits (e.g., moving edit focus to cell Y by committing edit of cell X with tab)
    are unintentionally killed during the re-render that's triggered by calling setReactionVariations.
    pendingReactionVariations accumulates intermediate updates that are submitted only when there aren't any ongoing edits.
    */
    if (pendingReactionVariations.current !== null && event.api.getEditingCells().length === 0) {
      setReactionVariations(pendingReactionVariations.current);
      pendingReactionVariations.current = null;
    }
  }, [setReactionVariations]);

  const applyColumnSelection = (columns) => {
    let updatedReactionVariations = addMissingColumnsToVariations({
      materials: reactionMaterials,
      segments: reactionSegments,
      selectedColumns: columns,
      variations: reactionVariations,
      reactionHasPolymers,
      durationValue,
      durationUnit,
      temperatureValue,
      temperatureUnit,
      gasMode,
      vesselVolume
    });
    updatedReactionVariations = removeObsoleteColumnsFromVariations(
      updatedReactionVariations,
      columns
    );
    setReactionVariations(updatedReactionVariations);

    setColumnDefinitions(
      {
        type: 'apply_column_selection',
        materials: reactionMaterials,
        segments: reactionSegments,
        selectedColumns: columns,
        gasMode
      }
    );

    setSelectedColumns(columns);
  };

  const addVariation = () => (
    <OverlayTrigger
      placement="bottom"
      overlay={(
        <Tooltip>
          Add row with current data from &quot;Scheme&quot; tab.
          <br />
          Changes in &quot;Scheme&quot; tab are not applied to
          {' '}
          <i>existing</i>
          {' '}
          rows.
        </Tooltip>
          )}
    >
      <Button size="sm" variant="success" onClick={addRow} className="mb-2">
        <i className="fa fa-plus me-1" />
        {' '}
        Add variation
      </Button>
    </OverlayTrigger>
  );

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
      updatedSelectedColumns
    );

    let updatedColumnDefinitions = removeObsoleteColumnDefinitions(columnDefinitions, updatedSelectedColumns);

    /*
    Update column definitions to account for potential changes in the corresponding materials' gas type.
    */
    updatedColumnDefinitions = updateColumnDefinitionsMaterialsOnAuxChange(
      updatedColumnDefinitions,
      reactionMaterials,
      gasMode
    );

    /*
    Update materials in response to changes in non-editable quantities from the "Scheme" tab.
    */
    updatedReactionVariations = updateVariationsOnAuxChange(
      updatedReactionVariations,
      reactionMaterials,
      gasMode,
      vesselVolume
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
        materials: Object.keys(materialTypes).reduce((materials, materialType) => {
          materials[materialType] = [];
          return materials;
        }, {}),
        selectedColumns: updatedSelectedColumns,
        segments: reactionSegments,
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

  if (!asyncDataLoaded) {
    return null;
  }

  return (
    <div>
      <ButtonGroup>
        {addVariation()}
        <RemoveVariationsModal onRemoveAll={() => setReactionVariations([])} />
        <ColumnSelection
          selectedColumns={selectedColumns}
          availableColumns={{
            ...getReactionMaterialsIDsToLabels(reactionMaterials),
            segments: Object.keys(reactionSegments).reduce((acc, segmentLabel) => {
              acc[segmentLabel] = segmentLabel;
              return acc;
            }, {}),
            properties: { duration: 'Duration', temperature: 'Temperature' },
            metadata: { notes: 'Notes', analyses: 'Analyses', group: 'Group' },
          }}
          onApply={applyColumnSelection}
        />
      </ButtonGroup>
      <div className="ag-theme-alpine ag-theme-reaction-variations">
        <AgGridReact
          ref={gridRef}
          initialState={initialGridState}
          rowData={reactionVariations}
          getRowId={(params) => params.data.id}
          rowDragManaged
          columnDefs={columnDefinitions}
          suppressPropertyNamesCheck
          defaultColDef={{
            editable: true,
            sortable: true,
            resizable: true,
            cellStyle: (params) => {
              const { editable } = params.colDef;
              const isEditable = typeof editable === 'function' ? editable(params) : editable;
              return isEditable === false ? { backgroundColor: '#e9ecef' } : null;
            },
          }}
          defaultColGroupDef={{
            resizable: true,
          }}
          dataTypeDefinitions={cellDataTypes}
          tooltipShowDelay={0}
          groupHeaderHeight={53}
          domLayout="autoHeight"
          maintainColumnOrder
          suppressNoRowsOverlay
          suppressDragLeaveHidesColumns
          context={{
            copyRow,
            removeRow,
            setColumnDefinitions,
            reactionHasPolymers,
            reactionShortLabel,
            allReactionAnalyses
          }}
          /*
          IMPORTANT: In conjunction with `onCellEditRequest`,
          `readOnlyEdit` ensures that all edits of `reaction.variations` go through `updateRow`,
          rather than the grid mutating `reaction.variations` directly on user edits.
          I.e., we take explicit control of state manipulation.
          */
          readOnlyEdit
          onCellEditRequest={updateRow}
          onCellEditingStopped={handleCellEditingStopped}
          onGridPreDestroyed={(event) => persistTableLayout(reaction.id, event, columnDefinitions)}
          onStateUpdated={(event) => persistTableLayout(reaction.id, event, columnDefinitions)}
          /*
          We need to persist manual row sort (i.e., user changes row order by dragging rows),
          since ag-grid does not persist manual row sort as part of the grid state.
          In contrast to sort by column, we persist manual row sorting in the data, not in the grid state.
          When the event fires, the grid has already mutated the row order, we just need to persist it.
          */
          onRowDragEnd={(event) => handleRowDrag(event)}
        />
      </div>
    </div>
  );
}

ReactionVariations.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
};
