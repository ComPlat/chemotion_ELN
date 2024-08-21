/* eslint-disable react/display-name */
import { AgGridReact } from 'ag-grid-react';
import React, {
  useRef, useState, useEffect, useMemo, useCallback
} from 'react';
import {
  Button, OverlayTrigger, Tooltip, Alert
} from 'react-bootstrap';
import { isEqual } from 'lodash';
import PropTypes from 'prop-types';
import Reaction from 'src/models/Reaction';
import {
  createVariationsRow, copyVariationsRow, updateVariationsRow, getCellDataType,
  temperatureUnits, durationUnits, getStandardUnit, materialTypes, updateColumnDefinitions,
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
  RowToolsCellRenderer, NoteCellEditor
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
      bsStyle="success"
      bsSize="xsmall"
      style={{ display: entry === 'equivalent' ? 'none' : 'inline' }}
      onClick={onUnitChanged}
    >
      {unit}
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
      bsStyle="default"
      bsSize="xsmall"
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
  column: PropTypes.instanceOf(AgGridReact.column).isRequired,
  context: PropTypes.instanceOf(AgGridReact.context).isRequired,
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
      field: null,
      cellRenderer: RowToolsCellRenderer,
      lockPosition: 'left',
      editable: false,
      sortable: false,
      minWidth: 140,
      cellDataType: 'object',
      headerComponent: null,
    },
    {
      headerName: 'Notes',
      field: 'notes',
      sortable: false,
      cellDataType: 'text',
      cellEditor: NoteCellEditor,
      cellEditorPopup: true,
    },
    {
      headerName: 'Analyses',
      field: 'analyses',
      tooltipValueGetter: getAnalysesOverlay,
      tooltipComponent: AnalysisOverlay,
      cellRenderer: AnalysesCellRenderer,
      cellEditor: AnalysesCellEditor,
      cellEditorPopup: true,
      cellEditorPopupPosition: 'under',
      cellDataType: 'object',
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
            names: ['Temperature'],
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
            names: ['Duration'],
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

  const dataTypeDefinitions = useMemo(() => ({
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
  }), []);

  const defaultColumnDefinitions = useMemo(() => ({
    editable: true,
    sortable: true,
    resizable: false,
    minWidth: 120,
    maxWidth: 200,
    wrapHeaderText: true,
    autoHeaderHeight: true,
  }), []);

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
      <Alert bsStyle="info">
        Save the reaction to enable the variations tab.
      </Alert>
    );
  }

  const fitColumnToContent = (event) => {
    const { column } = event;
    gridRef.current.api.autoSizeColumns([column], false);
  };

  return (
    <div>
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
        {/* Wrapping button in span necessary in order for OverlayTrigger to work */}
        <span>
          <Button bsSize="xsmall" bsStyle="success" onClick={addRow}>
            <i className="fa fa-plus" />
          </Button>
        </span>
      </OverlayTrigger>
      <div style={{ height: '50vh' }} className="ag-theme-alpine">
        <AgGridReact
          ref={gridRef}
          rowData={reactionVariations}
          rowDragEntireRow
          rowDragManaged
          columnDefs={columnDefinitions}
          suppressPropertyNamesCheck
          defaultColDef={defaultColumnDefinitions}
          dataTypeDefinitions={dataTypeDefinitions}
          tooltipShowDelay={0}
          domLayout="autoHeight"
          popupParent={document.getElementById('reaction-detail-tab') || null}
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
