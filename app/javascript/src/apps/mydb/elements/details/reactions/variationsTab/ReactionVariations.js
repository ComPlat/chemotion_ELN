/* eslint-disable react/display-name */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, useState, useEffect, useCallback
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
  temperatureUnits, durationUnits, getStandardUnit, materialTypes, updateColumnDefinitions,
  getUserFacingUnit
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  AnalysesCellRenderer, AnalysesCellEditor, getReactionAnalyses, updateAnalyses, getAnalysesOverlay, AnalysisOverlay
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import {
  getMaterialColumnGroupChild, updateColumnDefinitionsMaterials,
  getReactionMaterials, getReactionMaterialsIDs,
  removeObsoleteMaterialsFromVariations, addMissingMaterialsToVariations
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  PropertyFormatter, PropertyParser,
  MaterialFormatter, MaterialParser,
  EquivalentFormatter, EquivalentParser,
  RowToolsCellRenderer, NoteCellRenderer, NoteCellEditor
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsCellComponents';

function MenuHeader({
  column, context, setSort, names, entries
}) {
  const { field } = column.colDef;
  const { columnDefinitions, setColumnDefinitions } = context;
  const [ascendingSort, setAscendingSort] = useState('inactive');
  const [descendingSort, setDescendingSort] = useState('inactive');
  const [noSort, setNoSort] = useState('inactive');
  const [name, setName] = useState(names[0]);
  const [entry, setEntry] = useState(Object.keys(entries)[0]);
  const [units, setUnits] = useState(entries[entry]);
  const [unit, setUnit] = useState(units[0]);

  const onSortChanged = () => {
    setAscendingSort(column.isSortAscending() ? 'sort_active' : 'inactive');
    setDescendingSort(column.isSortDescending() ? 'sort_active' : 'inactive');
    setNoSort(
      !column.isSortAscending() && !column.isSortDescending()
        ? 'sort_active'
        : 'inactive'
    );
  };

  useEffect(() => {
    column.addEventListener('sortChanged', onSortChanged);
    onSortChanged();
  }, []);

  const onSortRequested = (order, event) => {
    setSort(order, event.shiftKey);
  };

  const onUnitChanged = () => {
    const newUnit = units[(units.indexOf(unit) + 1) % units.length];
    const newColumnDefinitions = updateColumnDefinitions(
      columnDefinitions,
      field,
      'currentEntryWithDisplayUnit',
      { entry, displayUnit: newUnit }
    );

    setUnit(newUnit);
    setColumnDefinitions(newColumnDefinitions);
  };

  const unitSelection = (
    <Button
      className="unitSelection"
      variant="success"
      size="sm"
      style={{ display: entry === 'equivalent' ? 'none' : 'inline' }}
      onClick={onUnitChanged}
    >
      {getUserFacingUnit(unit)}
    </Button>
  );

  const onEntryChanged = () => {
    const entryKeys = Object.keys(entries);
    const newEntry = entryKeys[(entryKeys.indexOf(entry) + 1) % entryKeys.length];
    const newUnits = entries[newEntry];
    const newUnit = newUnits[0];
    let newColumnDefinitions = updateColumnDefinitions(
      columnDefinitions,
      field,
      'cellDataType',
      getCellDataType(newEntry)
    );
    newColumnDefinitions = updateColumnDefinitions(
      newColumnDefinitions,
      field,
      'currentEntryWithDisplayUnit',
      { entry: newEntry, displayUnit: newUnit }
    );

    setEntry(newEntry);
    setUnits(newUnits);
    setUnit(newUnit);
    setColumnDefinitions(newColumnDefinitions);
  };

  const entrySelection = (
    <Button
      className="entrySelection"
      variant="light"
      size="sm"
      style={{ display: ['temperature', 'duration'].includes(entry) ? 'none' : 'inline' }}
      disabled={Object.keys(entries).length === 1}
      onClick={onEntryChanged}
    >
      {entry}
    </Button>
  );

  const sortMenu = (
    <div className="sortHeader" style={{ display: 'flex', alignItems: 'center', opacity: 0.5 }}>
      <div
        onClick={(event) => onSortRequested('asc', event)}
        onTouchEnd={(event) => onSortRequested('asc', event)}
        className={`customSortDownLabel ${ascendingSort}`}
      >
        <i className="fa fa-chevron-up fa-fw" />
      </div>
      <div
        onClick={(event) => onSortRequested('desc', event)}
        onTouchEnd={(event) => onSortRequested('desc', event)}
        className={`customSortUpLabel ${descendingSort}`}
      >
        <i className="fa fa-chevron-down fa-fw" />
      </div>
      <div
        onClick={(event) => onSortRequested('', event)}
        onTouchEnd={(event) => onSortRequested('', event)}
        className={`customSortRemoveLabel ${noSort}`}
      >
        <i className="fa fa-times fa-fw" />
      </div>
    </div>
  );

  return (
    <div style={{ display: 'grid' }}>
      <span
        className="header-title"
        onClick={() => setName(names[(names.indexOf(name) + 1) % names.length])}
      >
        {name}
      </span>
      <div>
        {entrySelection}
        {' '}
        {unitSelection}
      </div>
      {sortMenu}
    </div>
  );
}

MenuHeader.propTypes = {
  column: PropTypes.shape({
    colDef: PropTypes.object.isRequired,
    isSortAscending: PropTypes.func.isRequired,
    isSortDescending: PropTypes.func.isRequired,
    addEventListener: PropTypes.func.isRequired,
  }).isRequired,
  context: PropTypes.shape({
    columnDefinitions: PropTypes.arrayOf(PropTypes.object).isRequired,
    setColumnDefinitions: PropTypes.func.isRequired,
  }).isRequired,
  setSort: PropTypes.func.isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
  entries: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
};

export default function ReactionVariations({ reaction, onReactionChange }) {
  const gridRef = useRef(null);
  const [reactionVariations, _setReactionVariations] = useState(reaction.variations);
  const [allReactionAnalyses, setAllReactionAnalyses] = useState(getReactionAnalyses(reaction));
  const [reactionMaterials, setReactionMaterials] = useState(getReactionMaterials(reaction));
  const [columnDefinitions, setColumnDefinitions] = useState([
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
          currentEntryWithDisplayUnit: {
            entry: 'temperature',
            displayUnit: getStandardUnit('temperature')
          },
          headerComponent: MenuHeader,
          headerComponentParams: {
            names: ['T'],
            entries: { temperature: temperatureUnits }
          }
        },
        {
          field: 'properties.duration',
          cellDataType: getCellDataType('duration'),
          currentEntryWithDisplayUnit: {
            entry: 'duration',
            displayUnit: getStandardUnit('duration')
          },
          headerComponent: MenuHeader,
          headerComponentParams: {
            names: ['t'],
            entries: { duration: durationUnits }
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
    // Set updated state here and in parent component.
    _setReactionVariations(updatedReactionVariations);
    reaction.variations = updatedReactionVariations;
    onReactionChange(reaction);
  };

  const updatedReactionMaterials = getReactionMaterials(reaction);
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
    const updatedColumnDefinitions = updateColumnDefinitionsMaterials(
      columnDefinitions,
      updatedReactionMaterials,
      MenuHeader
    );
    let updatedReactionVariations = removeObsoleteMaterialsFromVariations(reactionVariations, updatedReactionMaterials);
    updatedReactionVariations = addMissingMaterialsToVariations(updatedReactionVariations, updatedReactionMaterials);

    setReactionVariations(updatedReactionVariations);
    setColumnDefinitions(updatedColumnDefinitions);
    setReactionMaterials(updatedReactionMaterials);
  }

  const updatedAllReactionAnalyses = getReactionAnalyses(reaction);
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

  if (reaction.isNew) {
    return (
      <Alert variant="info">
        Save the reaction to enable the variations tab.
      </Alert>
    );
  }

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
            columnDefinitions,
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
