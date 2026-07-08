/* eslint-disable react/display-name, no-param-reassign, react-hooks/immutability */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, useState, useCallback, useEffect, useMemo
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
  getReactionSegments, processHeaderForCsvExport
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

const initializeGridStore = (initialVariations = []) => ({
  reactionVariations: initialVariations,
  selectedColumns: getVariationsColumns(initialVariations),
  columnDefinitions: [],
  reactionSegments: {},
  asyncDataLoaded: false,
  gridVersion: 0,
});

const ReactionVariations = ({ reaction, onReactionChange }) => {
  const reactionHasPolymers = reaction.hasPolymers();
  const reactionShortLabel = reaction.short_label;
  const reactionMaterials = getReactionMaterials(reaction);
  const reactionMaterialsHashes = getReactionMaterialsHashes(
    reactionMaterials,
    reaction.gaseous,
    GasPhaseReactionStore.getState().reactionVesselSizeValue
  );
  const gasMode = reaction.gaseous;
  const allReactionAnalyses = getReactionAnalyses(reaction);
  const { dispValue: durationValue = null, dispUnit: durationUnit = 'None' } = reaction.durationDisplay ?? {};
  const { userText: temperatureValue = null, valueUnit: temperatureUnit = 'None' } = reaction.temperature ?? {};
  const vesselVolume = GasPhaseReactionStore.getState().reactionVesselSizeValue;

  const gridRef = useRef(null);
  const pendingReactionVariations = useRef(null);
  const previousReactionMaterialsHashes = useRef(reactionMaterialsHashes);
  const previousGasMode = useRef(gasMode);
  const previousAllReactionAnalyses = useRef(allReactionAnalyses);

  const [gridStore, setGridStore] = useState(() => initializeGridStore(reaction.variations ?? []));

  const {
    reactionVariations,
    selectedColumns,
    columnDefinitions,
    reactionSegments,
    asyncDataLoaded,
    gridVersion,
  } = gridStore;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // Fetch grid state on every re-mount.
  const initialGridState = useMemo(() => getInitialGridState(reaction.id), []);

  useEffect(() => {
    let isSubscribed = true;
    // Reset local store when switching reactions to avoid leaking previous reaction state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGridStore(initializeGridStore(reaction.variations ?? []));
    pendingReactionVariations.current = null;
    previousReactionMaterialsHashes.current = reactionMaterialsHashes;
    previousGasMode.current = gasMode;
    previousAllReactionAnalyses.current = allReactionAnalyses;

    const fetchData = async () => {
      const segments = await getReactionSegments(reaction);
      if (!isSubscribed) {
        return;
      }

      setGridStore((previousGridStore) => {
        const updatedSelectedColumns = {
          ...previousGridStore.selectedColumns,
          segments: previousGridStore.selectedColumns.segments.filter(
            (segment) => Object.hasOwn(segments, segment)
          )
        };
        let updatedReactionVariations = removeObsoleteColumnsFromVariations(
          previousGridStore.reactionVariations,
          updatedSelectedColumns
        );
        let updatedColumnDefinitions = getColumnDefinitions(
          updatedSelectedColumns,
          reactionMaterials,
          segments,
          gasMode,
        );

        updatedColumnDefinitions = setLayout(reaction.id, updatedColumnDefinitions);
        updatedReactionVariations = setRowOrder(reaction.id, updatedReactionVariations);

        return {
          ...previousGridStore,
          reactionSegments: segments,
          selectedColumns: updatedSelectedColumns,
          reactionVariations: updatedReactionVariations,
          columnDefinitions: updatedColumnDefinitions,
          asyncDataLoaded: true,
          gridVersion: previousGridStore.gridVersion + 1,
        };
      });
    };

    fetchData();
    return () => {
      isSubscribed = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reaction.id]);

  useEffect(() => {
    /*
    Propagate updates to parent
    */
    if (!asyncDataLoaded) {
      return;
    }
    if (isEqual(reaction.variations, reactionVariations)) {
      return;
    }

    reaction.variations = reactionVariations;
    onReactionChange(reaction);
  }, [asyncDataLoaded, onReactionChange, reaction, reactionVariations]);

  useEffect(() => {
    if (!asyncDataLoaded) {
      return;
    }

    if (gasMode !== previousGasMode.current) {
      /*
      Update gas mode according to "Scheme" tab.
      */
      const updatedSelectedColumns = getVariationsColumns([]);
      const materialsByType = Object.keys(materialTypes).reduce((materials, materialType) => {
        materials[materialType] = [];
        return materials;
      }, {});

      setGridStore((previousGridStore) => ({
        ...previousGridStore,
        selectedColumns: updatedSelectedColumns,
        columnDefinitions: getColumnDefinitions(
          updatedSelectedColumns,
          materialsByType,
          previousGridStore.reactionSegments,
          gasMode
        ),
        reactionVariations: [],
        gridVersion: previousGridStore.gridVersion + 1,
      }));

      previousGasMode.current = gasMode;
      previousReactionMaterialsHashes.current = reactionMaterialsHashes;
      return;
    }

    if (isEqual(reactionMaterialsHashes, previousReactionMaterialsHashes.current)) {
      return;
    }
    /*
    Keep set of materials up-to-date.
    Materials could have been added or removed in the "Scheme" tab.
    We need to only *remove* obsolete materials, not *add* missing ones, since users add materials manually.
    */
    setGridStore((previousGridStore) => {
      const updatedSelectedColumns = removeObsoleteMaterialColumns(
        reactionMaterials,
        previousGridStore.selectedColumns
      );

      let updatedReactionVariations = removeObsoleteColumnsFromVariations(
        previousGridStore.reactionVariations,
        updatedSelectedColumns
      );

      let updatedColumnDefinitions = removeObsoleteColumnDefinitions(
        previousGridStore.columnDefinitions,
        updatedSelectedColumns
      );
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

      return {
        ...previousGridStore,
        selectedColumns: updatedSelectedColumns,
        columnDefinitions: updatedColumnDefinitions,
        reactionVariations: updatedReactionVariations,
        gridVersion: previousGridStore.gridVersion + 1,
      };
    });

    previousReactionMaterialsHashes.current = reactionMaterialsHashes;
  }, [
    asyncDataLoaded,
    gasMode,
    reactionMaterials,
    reactionMaterialsHashes,
    vesselVolume,
  ]);

  useEffect(() => {
    if (!asyncDataLoaded) {
      return;
    }

    if (isEqual(allReactionAnalyses, previousAllReactionAnalyses.current)) {
      return;
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
    setGridStore((previousGridStore) => ({
      ...previousGridStore,
      reactionVariations: updateAnalyses(previousGridStore.reactionVariations, allReactionAnalyses)
    }));

    previousAllReactionAnalyses.current = allReactionAnalyses;
  }, [allReactionAnalyses, asyncDataLoaded]);

  const setColumnDefinitions = useCallback((action) => {
    setGridStore((previousGridStore) => ({
      ...previousGridStore,
      columnDefinitions: columnDefinitionsReducer(previousGridStore.columnDefinitions, action)
    }));
  }, []);

  const copyRow = useCallback((data) => {
    setGridStore((previousGridStore) => {
      const copiedRow = copyVariationsRow(data, previousGridStore.reactionVariations);
      return {
        ...previousGridStore,
        reactionVariations: [...previousGridStore.reactionVariations, copiedRow]
      };
    });
  }, []);

  const removeRow = useCallback((data) => {
    setGridStore((previousGridStore) => ({
      ...previousGridStore,
      reactionVariations: previousGridStore.reactionVariations.filter((row) => row.id !== data.id)
    }));
  }, []);

  const updateRow = useCallback(({ data: oldRow, colDef, newValue }) => {
    const { field } = colDef;
    const updatedRow = updateVariationsRow(oldRow, field, newValue, reactionHasPolymers);
    const updatedPendingReactionVariations = pendingReactionVariations.current ?? reactionVariations;
    pendingReactionVariations.current = updatedPendingReactionVariations.map(
      (row) => (row.id === oldRow.id ? updatedRow : row)
    );
    gridRef.current.api.applyTransaction({ update: [updatedRow] });
  }, [reactionVariations, reactionHasPolymers]);

  /*
  Defer setReactionVariations until all cell editing has stopped.
  Without deferring, ongoing edits (e.g., moving edit focus to cell Y by committing edit of cell X with tab)
  are unintentionally killed during the re-render that's triggered by calling setReactionVariations.
  pendingReactionVariations accumulates intermediate updates that are submitted only when there aren't any ongoing edits.
  */
  const handleCellEditingStopped = useCallback((event) => {
    if (pendingReactionVariations.current !== null && event.api.getEditingCells().length === 0) {
      const updatedReactionVariations = pendingReactionVariations.current;
      setGridStore((previousGridStore) => ({
        ...previousGridStore,
        reactionVariations: updatedReactionVariations
      }));
      pendingReactionVariations.current = null;
    }
  }, []);

  if (reaction.isNew) {
    return (
      <Alert variant="info">
        Save the reaction to enable the variations tab.
      </Alert>
    );
  }

  const handleRowDrag = (event) => {
    const rowOrder = [];
    event.api.forEachNode((node) => rowOrder.push(node.data.id));

    persistRowOrder(reaction.id, rowOrder);
    const reorderedVariations = rowOrder
      .map((id) => reactionVariations.find((row) => row.id === id))
      .filter(Boolean);
    setGridStore((previousGridStore) => ({
      ...previousGridStore,
      reactionVariations: reorderedVariations
    }));
  };

  const addRow = () => {
    setGridStore((previousGridStore) => ({
      ...previousGridStore,
      reactionVariations: [
        ...previousGridStore.reactionVariations,
        createVariationsRow(
          {
            materials: reactionMaterials,
            segments: previousGridStore.reactionSegments,
            selectedColumns: previousGridStore.selectedColumns,
            variations: previousGridStore.reactionVariations,
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
    }));
  };

  const applyColumnSelection = (columns) => {
    setGridStore((previousGridStore) => {
      let updatedReactionVariations = addMissingColumnsToVariations({
        materials: reactionMaterials,
        segments: previousGridStore.reactionSegments,
        selectedColumns: columns,
        variations: previousGridStore.reactionVariations,
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

      return {
        ...previousGridStore,
        selectedColumns: columns,
        reactionVariations: updatedReactionVariations,
        columnDefinitions: columnDefinitionsReducer(previousGridStore.columnDefinitions, {
          type: 'apply_column_selection',
          materials: reactionMaterials,
          segments: previousGridStore.reactionSegments,
          selectedColumns: columns,
          gasMode
        }),
        gridVersion: previousGridStore.gridVersion + 1,
      };
    });
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
      <Button size="sm" onClick={addRow} className="mb-2">
        <i className="fa fa-plus me-1" />
        Add variation
      </Button>
    </OverlayTrigger>
  );

  const exportTable = () => (
    <Button
      size="sm"
      className="mb-2"
      onClick={() => gridRef.current.api.exportDataAsCsv({ processHeaderCallback: processHeaderForCsvExport })}
    >
      <i className="icon-arrow-up-from-bracket me-1" />
      Export to CSV
    </Button>
  );

  if (!asyncDataLoaded) {
    return null;
  }

  return (
    <div>
      <ButtonGroup>
        {addVariation()}
        {exportTable()}
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
        <RemoveVariationsModal
          onRemoveAll={() => setGridStore((previousGridStore) => ({
            ...previousGridStore,
            reactionVariations: []
          }))}
        />
      </ButtonGroup>
      <div className="ag-theme-alpine ag-theme-reaction-variations">
        <AgGridReact
          // Re-mount grid on version change
          key={`${reaction.id}-schema-${gridVersion}`}
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
          suppressColumnVirtualisation={typeof window !== 'undefined' && !!window.Cypress}
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
          onGridPreDestroyed={(event) => persistTableLayout(reaction.id, event, gridStore.columnDefinitions)}
          onStateUpdated={(event) => persistTableLayout(reaction.id, event, gridStore.columnDefinitions)}
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
};

ReactionVariations.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
};

export default ReactionVariations;
