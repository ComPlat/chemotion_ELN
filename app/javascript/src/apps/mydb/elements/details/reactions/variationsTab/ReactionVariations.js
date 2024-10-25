/* eslint-disable react/display-name */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, useState, useCallback, useReducer
} from 'react';
import {
  Button, OverlayTrigger, Tooltip, Alert,
  ButtonGroup, Modal
} from 'react-bootstrap';
import { isEqual } from 'lodash';
import PropTypes from 'prop-types';
import Reaction from 'src/models/Reaction';
import {
  createVariationsRow, copyVariationsRow, updateVariationsRow, getCellDataType,
  temperatureUnits, durationUnits, getStandardUnit, materialTypes
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  AnalysesCellRenderer, AnalysesCellEditor, getReactionAnalyses, updateAnalyses, getAnalysesOverlay, AnalysisOverlay
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import {
  getMaterialColumnGroupChild,
  getReactionMaterials, getReactionMaterialsIDs,
  removeObsoleteMaterialsFromVariations, addMissingMaterialsToVariations
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  PropertyFormatter, PropertyParser,
  MaterialFormatter, MaterialParser,
  EquivalentFormatter, EquivalentParser,
  NoteCellRenderer, NoteCellEditor,
  RowToolsCellRenderer, MenuHeader
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
  columnDefinitionsReducer
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsReducers';

export default function ReactionVariations({ reaction, onReactionChange }) {
  const gridRef = useRef(null);
  const reactionVariations = reaction.variations;
  const [gasMode, setGasMode] = useState(reaction.gaseous);
  const [allReactionAnalyses, setAllReactionAnalyses] = useState(getReactionAnalyses(reaction));
  const [reactionMaterials, setReactionMaterials] = useState(getReactionMaterials(reaction));
  const [columnDefinitions, setColumnDefinitions] = useReducer(columnDefinitionsReducer, [
    {
      headerName: 'Tools',
      cellRenderer: RowToolsCellRenderer,
      lockPosition: 'left',
      sortable: false,
      maxWidth: 100,
      cellDataType: false,
    },
    {
      headerName: 'Notes',
      field: 'notes',
      cellRenderer: NoteCellRenderer,
      sortable: false,
      cellDataType: 'text',
      cellEditor: NoteCellEditor,
    },
    {
      headerName: 'Analyses',
      field: 'analyses',
      tooltipValueGetter: getAnalysesOverlay,
      tooltipComponent: AnalysisOverlay,
      cellRenderer: AnalysesCellRenderer,
      cellEditor: AnalysesCellEditor,
      cellDataType: false,
      sortable: false,
    },
    {
      headerName: 'Properties',
      groupId: 'properties',
      marryChildren: true,
      children: [
        {
          field: 'properties.temperature',
          cellDataType: getCellDataType('temperature'),
          entryDefs: {
            currentEntry: 'temperature',
            displayUnit: getStandardUnit('temperature'),
            availableEntriesWithUnits: { temperature: temperatureUnits }
          },
          headerComponent: MenuHeader,
          headerComponentParams: {
            names: ['T'],
          }
        },
        {
          field: 'properties.duration',
          cellDataType: getCellDataType('duration'),
          editable: !gasMode,
          entryDefs: {
            currentEntry: 'duration',
            displayUnit: getStandardUnit('duration'),
            availableEntriesWithUnits: { duration: durationUnits }
          },
          headerComponent: MenuHeader,
          headerComponentParams: {
            names: ['t'],
          }
        },
      ]
    },
  ].concat(
    Object.entries(reactionMaterials).map(([materialType, materials]) => ({
      headerName: materialTypes[materialType].label,
      groupId: materialType,
      marryChildren: true,
      children: materials.map((material) => getMaterialColumnGroupChild(material, materialType, MenuHeader))
    }))
  ));

  const dataTypeDefinitions = {
    property: {
      extendsDataType: 'object',
      baseDataType: 'object',
      valueFormatter: PropertyFormatter,
      valueParser: PropertyParser,
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
      valueFormatter: EquivalentFormatter,
      valueParser: EquivalentParser,
    }
  };

  const defaultColumnDefinitions = {
    editable: true,
    sortable: true,
    resizable: false,
  };

  const setReactionVariations = (updatedReactionVariations) => {
    reaction.variations = updatedReactionVariations;
    onReactionChange(reaction);
  };

  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const updatedReactionMaterials = getReactionMaterials(reaction);
  const updatedGasMode = reaction.gaseous;
  const updatedAllReactionAnalyses = getReactionAnalyses(reaction);

  if (
    !isEqual(
      getReactionMaterialsIDs(reactionMaterials),
      getReactionMaterialsIDs(updatedReactionMaterials)
    )
  ) {
    /*
    Keep set of materials up-to-date.
    Materials could have been added or removed in the "Scheme" tab.
    These changes need to be reflected in the variations.
    */
    let updatedReactionVariations = removeObsoleteMaterialsFromVariations(reactionVariations, updatedReactionMaterials);
    updatedReactionVariations = addMissingMaterialsToVariations(updatedReactionVariations, updatedReactionMaterials);

    setReactionVariations(updatedReactionVariations);
    setColumnDefinitions(
      {
        type: 'update_on_render',
        reactionMaterials: updatedReactionMaterials
      }
    );
    setReactionMaterials(updatedReactionMaterials);
  }

  if (gasMode !== updatedGasMode) {
    setColumnDefinitions(
      {
        type: 'toggle_gas_mode',
        gasMode: updatedGasMode,
      }
    );
    setGasMode(updatedGasMode);
  }

  if (!isEqual(allReactionAnalyses, updatedAllReactionAnalyses)) {
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
    const updatedReactionVariations = updateAnalyses(reactionVariations, updatedAllReactionAnalyses);
    setReactionVariations(updatedReactionVariations);
    setAllReactionAnalyses(updatedAllReactionAnalyses);
  }

  const addRow = useCallback(() => {
    setReactionVariations(
      [...reactionVariations, createVariationsRow(reaction, reactionVariations)]
    );
  }, [reaction, reactionVariations]);

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
    const updatedRow = updateVariationsRow(oldRow, field, newValue, reaction.hasPolymers());
    setReactionVariations(
      reactionVariations.map((row) => (row.id === oldRow.id ? updatedRow : row))
    );
  }, [reactionVariations, reaction]);

  const fitColumnToContent = (event) => {
    const { column } = event;
    gridRef.current.api.autoSizeColumns([column], false);
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
          <i className="fa fa-trash me-1" />
          {' '}
          Remove all Variations
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
        Add Variation
      </Button>
    </OverlayTrigger>
  );

  if (reaction.isNew) {
    return (
      <Alert variant="info">
        Save the reaction to enable the variations tab.
      </Alert>
    );
  }

  return (
    <div>
      <ButtonGroup>
        {addVariation()}
        {removeAllVariations()}
      </ButtonGroup>
      <div className="ag-theme-alpine ag-theme-reaction-variations">
        <AgGridReact
          ref={gridRef}
          rowData={reactionVariations}
          rowDragEntireRow
          rowDragManaged
          headerHeight={70}
          columnDefs={columnDefinitions}
          suppressPropertyNamesCheck
          defaultColDef={defaultColumnDefinitions}
          dataTypeDefinitions={dataTypeDefinitions}
          tooltipShowDelay={0}
          domLayout="autoHeight"
          context={{
            copyRow,
            removeRow,
            setColumnDefinitions,
            reactionHasPolymers: reaction.hasPolymers(),
            reactionShortLabel: reaction.short_label,
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
          onFirstDataRendered={() => gridRef.current.api.autoSizeAllColumns()}
          onCellValueChanged={(event) => fitColumnToContent(event)}
          onColumnHeaderClicked={(event) => fitColumnToContent(event)}
        />
      </div>
    </div>
  );
}

ReactionVariations.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
};
