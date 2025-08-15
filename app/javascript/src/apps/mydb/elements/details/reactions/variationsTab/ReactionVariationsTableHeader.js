import React, {useEffect, useState} from "react";
import {
    getStandardUnits,
    getUserFacingUnit
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {Button, OverlayTrigger, Tooltip} from "react-bootstrap";
import PropTypes from "prop-types";
import {GenUnitBtn} from 'chem-generic-ui'
import {AgGridReact} from "ag-grid-react";


function materialUnitsButtons(colDef, setColumnDefinitions, gasType) {
    const {
        field,
        entryDefs,
    } = colDef;
    if (!entryDefs) {
        return [null, null];
    }
    const {
        currentEntry,
        displayUnit,
        availableEntries,
    } = entryDefs;
    const units = getStandardUnits(currentEntry);
    const currentEntryTitle = currentEntry.split(/(?=[A-Z])/)
        .join(' ')
        .toLowerCase(); // e.g. 'turnoverNumber' -> 'turnover number'

    const onUnitChanged = () => {
        const newDisplayUnit = units[(units.indexOf(displayUnit) + 1) % units.length];

        setColumnDefinitions(
            {
                type: 'update_entry_defs',
                field,
                entryDefs: {
                    currentEntry,
                    displayUnit: newDisplayUnit,
                    availableEntries,
                },
                gasType,
            },
        );
    };

    const unitSelection = (
        <Button
            className={`unitSelection ${displayUnit === null ? 'd-none' : 'd-inline'}`}
            variant="success"
            size="sm"
            disabled={units.length === 1}
            onClick={onUnitChanged}
        >
            {getUserFacingUnit(displayUnit)}
        </Button>
    );

    const onEntryChanged = () => {
        const newCurrentEntry = availableEntries[(availableEntries.indexOf(currentEntry) + 1) % availableEntries.length];
        const newUnit = getStandardUnits(newCurrentEntry)[0];

        setColumnDefinitions(
            {
                type: 'update_entry_defs',
                field,
                entryDefs: {
                    currentEntry: newCurrentEntry,
                    displayUnit: newUnit,
                    availableEntries,
                },
                gasType,
            },
        );
    };

    const entrySelection = (
        <Button
            className="entrySelection"
            variant="light"
            size="sm"
            disabled={availableEntries.length === 1}
            onClick={onEntryChanged}
        >
            {currentEntryTitle}
        </Button>
    );

    return [entrySelection, unitSelection];
}

function useStates(context, name) {
    const {setColumnDefinitions} = context;
    return {
        setColumnDefinitions,
        ascendingState: useState('inactive'),
        descendingState: useState('inactive'),
        noSortState: useState('inactive'),
        nameState: useState(name)
    }
}

function setSortEffects({ascendingState, descendingState, noSortState, column, setSort}) {

    const [ascendingSort, setAscendingSort] = ascendingState
    const [descendingSort, setDescendingSort] = descendingState;
    const [noSort, setNoSort] = noSortState;
    const onSortChanged = () => {
        setAscendingSort(column.isSortAscending() ? 'sort_active' : 'inactive');
        setDescendingSort(column.isSortDescending() ? 'sort_active' : 'inactive');
        setNoSort(
            !column.isSortAscending() && !column.isSortDescending()
                ? 'sort_active'
                : 'inactive',
        );
    };

    useEffect(() => {
        column.addEventListener('sortChanged', onSortChanged);
        onSortChanged();
    }, []);

    const onSortRequested = (order, event) => {
        setSort(order, event.shiftKey);
    };

    return (
        <div className="sortHeader d-flex align-items-center">
            <Button
                variant="link"
                onClick={(event) => onSortRequested('asc', event)}
                onTouchEnd={(event) => onSortRequested('asc', event)}
                className={`customSortDownLabel ${ascendingSort}`}
            >
                <i className="fa fa-chevron-up fa-fw"/>
            </Button>
            <Button
                variant="link"
                onClick={(event) => onSortRequested('desc', event)}
                onTouchEnd={(event) => onSortRequested('desc', event)}
                className={`customSortUpLabel ${descendingSort}`}
            >
                <i className="fa fa-chevron-down fa-fw"/>
            </Button>
            <Button
                variant="link"
                onClick={(event) => onSortRequested('', event)}
                onTouchEnd={(event) => onSortRequested('', event)}
                className={`customSortRemoveLabel ${noSort}`}
            >
                <i className="fa fa-times fa-fw"/>
            </Button>
        </div>
    )
}

function SectionMenuHeader({
                               column,
                               context,
                               setSort,
                               names,
                               api,
                           }) {
    const {
        setColumnDefinitions,
        ascendingState, descendingState, noSortState,
        nameState: [name, setName]
    } = useStates(context, names[0]);
    const {setReactionVariations} = context;
    const onSortRequested = setSortEffects({
        ascendingState, descendingState, noSortState,
        column,
        setSort
    });

    const sortMenu = setSortEffects({
        ascendingState, descendingState, noSortState,
        column,
        setSort
    });

    const {genericField, genericLayer} = column.colDef.cellEditorParams;

    let unitBtn;
    if (genericField.type === 'system-defined') {

        const {
            displayUnit,
        } = column.colDef.entryDefs;
        const values = [];
        api.forEachNode((node) => {
            const fildId = column.colDef.field.replace(/^segmentData./, '');
            values.push(node.data.segmentData[fildId].value ?? 0);
        });
        const fieldData = {
            type: genericField.type,
            measurable_quantity: genericField.option_layers,
            unit: displayUnit,
            values: values,

        }

        unitBtn = <GenUnitBtn generic={fieldData} fnCb={(a) => {


            const updatedRows = [];

            api.forEachNode((node) => {
                const fildId = column.colDef.field.replace(/^segmentData./, '');
                const updatedRow = {
                    ...node.data,
                    segmentData: {...node.data.segmentData, [fildId]: {value: a.values.shift()}}
                };
                updatedRows.push(updatedRow);
            });

            setReactionVariations(updatedRows);

            setColumnDefinitions({
                field: column.colDef.field,
                type: 'update_entry_defs',
                only_update_entry_defs: true,
                entryDefs: {
                    ...column.colDef.entryDefs,
                    displayUnit: a.unit,
                },
            });
        }}/>;
    }

    return (<div className="d-grid">
            <OverlayTrigger
                placement="bottom"
                overlay={(
                    <Tooltip>
                        Layer: {genericLayer.label}
                    </Tooltip>
                )}
            >

              <span
                  role="button"
                  className="header-title mb-1"
                  tabIndex={0}
              >
                {`${name}`}
              </span>
            </OverlayTrigger>
            {unitBtn}
            {sortMenu}
        </div>
    );

}

function MenuHeader({
                        column,
                        context,
                        setSort,
                        names,
                        gasType = 'off',
                    }) {
    const {
        setColumnDefinitions,
        ascendingState, descendingState, noSortState,
        nameState: [name, setName]
    } = useStates(context, names[0]);


    let [entrySelection, unitSelection] = materialUnitsButtons(column.colDef, setColumnDefinitions, gasType);

    const sortMenu = setSortEffects({
        ascendingState, descendingState, noSortState,
        column,
        setSort
    });
    const handleTitleClick = () => setName(names[(names.indexOf(name) + 1) % names.length]);
    return (
        <div className="d-grid">
      <span
          role="button"
          className="header-title"
          tabIndex={0}
          onClick={handleTitleClick}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleTitleClick()}
      >
        {`${name} ${gasType !== 'off' ? `(${gasType})` : ''}`}
      </span>
            {entrySelection && unitSelection && (
                <div>
                    {entrySelection}
                    {' '}
                    {unitSelection}
                </div>
            )}
            {sortMenu}
        </div>
    );
}

MenuHeader.propTypes = {
  column: PropTypes.instanceOf(AgGridReact.column).isRequired,
  context: PropTypes.instanceOf(AgGridReact.context).isRequired,
  setSort: PropTypes.func.isRequired,
  names: PropTypes.arrayOf(PropTypes.string).isRequired,
  gasType: PropTypes.string,
};

MenuHeader.defaultProps = {
    gasType: 'off',
};

export {
    MenuHeader,
    SectionMenuHeader
}