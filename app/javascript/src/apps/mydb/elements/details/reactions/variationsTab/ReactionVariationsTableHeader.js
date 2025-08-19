import React, {useEffect, useState} from "react";
import {
    getStandardUnits,
    getUserFacingUnit
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {Button, Modal, OverlayTrigger, Tooltip} from "react-bootstrap";
import PropTypes from "prop-types";
import {GenUnitBtn} from 'chem-generic-ui'
import {AgGridReact} from "ag-grid-react";



function MaterialEntrySelection({ entryDefs, onChange }) {
    const [showModal, setShowModal] = useState(false);

    const handleEntrySelection = (item) => {
        const updated = { ...entryDefs };
        const wasMain = updated[item].isMain;
        const wasSelected = updated[item].isSelected;
        const selectedCount = Object.values(updated).filter((entry) => entry.isSelected).length;

        // Prevent deselection if this is the last selected item
        if (wasSelected && selectedCount <= 1) {
            return;
        }

        // Toggle the selection state
        updated[item] = {
            ...updated[item],
            isSelected: !wasSelected,
            isMain: wasSelected ? false : wasMain // Clear isMain if deselecting
        };

        // If we're deselecting the current main entry, find a new main entry
        if (wasMain && wasSelected) {
            const firstAvailable = Object.keys(updated).find(
                (key) => key !== item && updated[key].isSelected
            );
            if (firstAvailable) {
                updated[firstAvailable].isMain = true;
            }
        }

        onChange(updated);
    };

    const handleUnitChange = (item, unit) => {
        const updated = {
            ...entryDefs,
            [item]: {
                ...entryDefs[item],
                displayUnit: unit
            }
        };

        onChange(updated);
    };

    const handleMainEntryChange = (item) => {
        const updated = { ...entryDefs };

        Object.keys(updated).forEach((key) => {
            // Clear previous main entry
            if (updated[key].isMain) {
                updated[key].isMain = false;
            }
        });

        // Set new main entry
        updated[item].isMain = true;

        onChange(updated);
    };

    return (
        <div className="w-100">
            <div className="d-inline-block">
                <Button className="w-100" onClick={() => setShowModal(true)}>
                    Entries
                </Button>
                <ol className="list-group list-group-horizontal w-100">
                    {Object.entries(entryDefs).map(([entry, entryDef]) => (!entryDef.isSelected ? null : (
                        <MaterialEntry key={entry} entry={entry} isMain={entryDef.isMain}>
                            {getUserFacingEntryName(entry)}
                            {' '}
                            {entryDef.displayUnit === null ? '' : `(${getUserFacingUnit(entryDef.displayUnit)})` }
                        </MaterialEntry>

                    )))}
                </ol>
            </div>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Select entries</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Table striped bordered hover className="table-layout-fixed">
                        <thead>
                        <tr>
                            <th>Selected</th>
                            <th>Entry</th>
                            <th>Unit</th>
                            <th>Main entry (editable, sortable)</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.entries(entryDefs).map(([entry, entryDef]) => {
                            const units = getStandardUnits(entry);
                            return (
                                <tr key={entry}>
                                    <td className="text-center">
                                        <Form.Check
                                            type="checkbox"
                                            checked={entryDef.isSelected || false}
                                            onChange={() => handleEntrySelection(entry)}
                                        />
                                    </td>
                                    <td>{getUserFacingEntryName(entry)}</td>
                                    <td>
                                        {units.length > 1 ? (
                                            <Form.Select
                                                size="sm"
                                                value={entryDef.displayUnit || ''}
                                                onChange={(e) => handleUnitChange(entry, e.target.value)}
                                            >
                                                {units.map((unit) => (
                                                    <option key={unit} value={unit}>{getUserFacingUnit(unit)}</option>
                                                ))}
                                            </Form.Select>
                                        ) : getUserFacingUnit(units[0])}
                                    </td>
                                    <td className="text-center">
                                        <Form.Check
                                            type="radio"
                                            name="default"
                                            checked={entryDef.isMain || false}
                                            onChange={() => handleMainEntryChange(entry)}
                                            disabled={!entryDef.isSelected}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </Table>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

MaterialEntrySelection.propTypes = {
    entryDefs: PropTypes.objectOf(
        PropTypes.shape({
            isMain: PropTypes.bool.isRequired,
            isSelected: PropTypes.bool.isRequired,
            displayUnit: PropTypes.string.isRequired,
        })
    ).isRequired,
    onChange: PropTypes.func.isRequired,
};

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
    const {entryDefs} = column.colDef;


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
            {sortMenu}
            <MaterialEntrySelection entryDefs={entryDefs} onChange={onEntryDefChange}/>
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