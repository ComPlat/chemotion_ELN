/* eslint-disable react/display-name */
import React, {useState, useEffect} from 'react';
import Select from 'react-select';
import {AgGridReact} from 'ag-grid-react';
import {
    Button, ButtonGroup, Modal, Form, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import PropTypes from 'prop-types';
import {
    getVariationsRowName, convertUnit, getStandardUnits,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  getReferenceMaterial, getCatalystMaterial, getFeedstockMaterial, getMolFromGram, getGramFromMol,
  computeEquivalent, computePercentYield, computePercentYieldGas, getVolumeFromGram, getGramFromVolume,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { parseNumericStringOrNum } from 'src/utilities/MathUtils';
import {
  calculateGasMoles, calculateTON, calculateFeedstockMoles, calculateFeedstockVolume, calculateGasVolume,
} from 'src/utilities/UnitsConversion';

function RowToolsCellRenderer({
                                  data: row,
                                  context,
                              }) {
    const {
        reactionShortLabel,
        copyRow,
        removeRow,
    } = context;
    return (
        <div>
            <ButtonGroup>
                <OverlayTrigger
                    placement="bottom"
                    overlay={<Tooltip>{getVariationsRowName(reactionShortLabel, row.id)}</Tooltip>}
                >
                    <Button size="xsm" variant="secondary">{row.id}</Button>
                </OverlayTrigger>
                <Button size="xsm" variant="success" onClick={() => copyRow(row)}>
                    <i className="fa fa-clone"/>
                </Button>
                <Button size="xsm" variant="danger" onClick={() => removeRow(row)}>
                    <i className="fa fa-trash-o"/>
                </Button>
            </ButtonGroup>
        </div>
    );
}

RowToolsCellRenderer.propTypes = {
    data: PropTypes.shape({
        id: PropTypes.number.isRequired,
    }).isRequired,
    context: PropTypes.shape({
        reactionShortLabel: PropTypes.string.isRequired,
        copyRow: PropTypes.func.isRequired,
        removeRow: PropTypes.func.isRequired,
    }).isRequired,
};

function EquivalentParser({
  data: row,
  oldValue: cellData,
  newValue,
}) {
  let equivalent = parseNumericStringOrNum(newValue);
  if (equivalent < 0) {
    equivalent = 0;
  }
  const referenceMaterial = getReferenceMaterial(row);
  if (!referenceMaterial) {
    return {
      ...cellData,
      equivalent: { ...cellData.equivalent, value: equivalent },
    };
  }

  const referenceMol = getMolFromGram(referenceMaterial.mass.value, referenceMaterial);
  const mass = getGramFromMol(referenceMol * equivalent, cellData);
  const amount = getMolFromGram(mass, cellData);
  const volume = getVolumeFromGram(mass, cellData);

    return {
        ...cellData,
        mass: {...cellData.mass, value: mass},
        amount: {...cellData.amount, value: amount},
        volume: {...cellData.volume, value: volume},
        equivalent: {...cellData.equivalent, value: equivalent},
    };
}

function SegmentFormatter({
                              value: cellData,
                              colDef,
                          }) {
    const { cellEditorParams } = colDef;
    const { fieldType } = cellEditorParams;
    let newValue = cellData;
    if (typeof cellData === 'object') {
        newValue = cellData?.value ?? '';
    }
    if (fieldType === 'integer') {
        return parseInt(newValue, 10);
    }
    if (fieldType === 'select') {
        if (cellEditorParams.values.includes(newValue)) {
            return newValue;
        }
        return '';
    }
    if (fieldType === 'system-defined') {
        return parseFloat(Number(newValue).toPrecision(4));
    }
    return `${newValue}`;
}

function SegmentParser({
                           oldValue: cellData,
                           newValue,
                           colDef,
                       }) {
    const value = SegmentFormatter({
        value: newValue,
        colDef,
    });

    return {
        ...cellData,
        value,
    };
}

function PropertyFormatter({
                               value: cellData,
                               colDef,
                           }) {
    const {displayUnit} = colDef.entryDefs;
    const valueInDisplayUnit = convertUnit(Number(cellData.value), cellData.unit, displayUnit);

    return parseFloat(Number(valueInDisplayUnit)
        .toPrecision(4));
}

function PropertyParser({
                            oldValue: cellData,
                            newValue,
                            colDef,
                        }) {
    const {
        currentEntry,
        displayUnit,
    } = colDef.entryDefs;
    let value = parseNumericStringOrNum(newValue);
    if (currentEntry !== 'temperature' && value < 0) {
        value = 0;
    }
    value = convertUnit(value, displayUnit, cellData.unit);
    return {
        ...cellData,
        value,
    };
}

function MaterialFormatter({value: cellData, colDef}) {
    const {currentEntry, displayUnit} = colDef.entryDefs;
    const valueInDisplayUnit = convertUnit(
        Number(cellData[currentEntry].value),
        cellData[currentEntry].unit,
        displayUnit
    );

    return parseFloat(Number(valueInDisplayUnit)
        .toPrecision(4));
}

function MaterialParser({
                            data: row,
                            oldValue: cellData,
                            newValue,
                            colDef,
                            context,
                        }) {
    const {
        currentEntry,
        displayUnit,
    } = colDef.entryDefs;
    let value = convertUnit(parseNumericStringOrNum(newValue), displayUnit, cellData[currentEntry].unit);
    if (value < 0) {
        value = 0;
    }
    let updatedCellData = {
        ...cellData,
        [currentEntry]: {
            ...cellData[currentEntry],
            value,
        },
    };

    switch (currentEntry) {
        case 'mass': {
            const amount = getMolFromGram(value, updatedCellData);
            const volume = getVolumeFromGram(value, updatedCellData);
            updatedCellData = {
                ...updatedCellData,
                amount: {...updatedCellData.amount, value: amount},
                volume: {...updatedCellData.volume, value: volume}
            };
            break;
        }
        case 'amount': {
            const mass = getGramFromMol(value, updatedCellData);
            const volume = getVolumeFromGram(mass, updatedCellData);
            updatedCellData = {
                ...updatedCellData,
                mass: {...updatedCellData.mass, value: mass},
                volume: {...updatedCellData.volume, value: volume}
            };
            break;
        }
        case 'volume': {
            const mass = getGramFromVolume(value, updatedCellData);
            const amount = getMolFromGram(mass, updatedCellData);
            updatedCellData = {
                ...updatedCellData,
                mass: {...updatedCellData.mass, value: mass},
                amount: {...updatedCellData.amount, value: amount}
            };
            break;
        }
        default:
            break;
    }
    if (updatedCellData.aux.isReference) {
        return updatedCellData;
    }

  const referenceMaterial = getReferenceMaterial(row);
  if (!referenceMaterial) {
    return updatedCellData;
  }

    // Adapt equivalent to updated mass.
    if ('equivalent' in updatedCellData) {
        const equivalent = computeEquivalent(updatedCellData, referenceMaterial);
        updatedCellData = {
            ...updatedCellData,
            equivalent: {
                ...updatedCellData.equivalent,
                value: equivalent,
            },
        };
    }

    // Adapt yield to updated mass.
    if ('yield' in updatedCellData) {
        const percentYield = computePercentYield(updatedCellData, referenceMaterial, context.reactionHasPolymers);
        updatedCellData = {
            ...updatedCellData,
            yield: {
                ...updatedCellData.yield,
                value: percentYield,
            },
        };
    }

    return updatedCellData;
}

function GasParser({
                       data: row,
                       oldValue: cellData,
                       newValue,
                       colDef,
                   }) {
    const {
        currentEntry,
        displayUnit,
    } = colDef.entryDefs;
    let value = convertUnit(parseNumericStringOrNum(newValue), displayUnit, cellData[currentEntry].unit);
    if (currentEntry !== 'temperature' && value < 0) {
        value = 0;
    }
    let updatedCellData = {
        ...cellData,
        [currentEntry]: {
            ...cellData[currentEntry],
            value,
        },
    };

    switch (currentEntry) {
        case 'concentration':
        case 'temperature': {
            const temperatureInKelvin = convertUnit(
                updatedCellData.temperature.value,
                updatedCellData.temperature.unit,
                'K'
            );
            const concentration = updatedCellData.concentration.value;
            const {vesselVolume} = updatedCellData.aux;

            const amount = calculateGasMoles(vesselVolume, concentration, temperatureInKelvin);
            const mass = getGramFromMol(amount, updatedCellData);
            const volume = calculateGasVolume(
                amount,
                {part_per_million: concentration, temperature: {value: temperatureInKelvin, unit: 'K'}}
            );

            const catalyst = getCatalystMaterial(row);
            const catalystAmount = catalyst?.amount.value ?? 0;
            const turnoverNumber = calculateTON(amount, catalystAmount);

            const percentYield = computePercentYieldGas(amount, getFeedstockMaterial(row), vesselVolume);

            updatedCellData = {
                ...updatedCellData,
                mass: {...updatedCellData.mass, value: mass},
                amount: {...updatedCellData.amount, value: amount},
                volume: {...updatedCellData.volume, value: volume},
                yield: {...updatedCellData.yield, value: percentYield},
                turnoverNumber: {...updatedCellData.turnoverNumber, value: turnoverNumber},
            };
            break;
        }
        default:
            break;
    }

    const durationInHours = convertUnit(
        updatedCellData.duration.value,
        updatedCellData.duration.unit,
        'Hour(s)'
    );
    const turnoverNumber = updatedCellData.turnoverNumber.value;
    const turnoverFrequency = turnoverNumber / (durationInHours || 1);

    return {
        ...updatedCellData,
        turnoverFrequency: {
            ...updatedCellData.turnoverFrequency,
            value: turnoverFrequency,
        },
    };
}

function FeedstockParser({
                             data: row,
                             oldValue: cellData,
                             newValue,
                             colDef,
                         }) {
    const {
        currentEntry,
        displayUnit,
    } = colDef.entryDefs;
    let value = convertUnit(parseNumericStringOrNum(newValue), displayUnit, cellData[currentEntry].unit);
    if (value < 0) {
        value = 0;
    }
    let updatedCellData = {
        ...cellData,
        [currentEntry]: {
            ...cellData[currentEntry],
            value,
        },
    };

    switch (currentEntry) {
        case 'amount': {
            const amount = updatedCellData.amount.value;
            const mass = getGramFromMol(amount, updatedCellData);

            const purity = updatedCellData.aux.purity || 1;
            const volume = calculateFeedstockVolume(amount, purity);

            updatedCellData = {
                ...updatedCellData,
                mass: {
                    ...updatedCellData.mass,
                    value: mass,
                },
                volume: {
                    ...updatedCellData.volume,
                    value: volume,
                },
            };
            break;
        }
        case 'volume': {
            const volume = updatedCellData.volume.value;
            const purity = updatedCellData.aux.purity || 1;
            const amount = calculateFeedstockMoles(volume, purity);

            const mass = getGramFromMol(amount, updatedCellData);

            updatedCellData = {
                ...updatedCellData,
                mass: {
                    ...updatedCellData.mass,
                    value: mass,
                },
                amount: {
                    ...updatedCellData.amount,
                    value: amount,
                },
            };
            break;
        }
        case 'equivalent': {
            return updatedCellData;
        }
        default:
            break;
    }

    if (updatedCellData.aux.isReference) {
        return updatedCellData;
    }

  const referenceMaterial = getReferenceMaterial(row);
  if (!referenceMaterial) {
    return updatedCellData;
  }

  const equivalent = computeEquivalent(updatedCellData, referenceMaterial);

    return {
        ...updatedCellData,
        equivalent: {
            ...updatedCellData.equivalent,
            value: equivalent,
        },
    };
}

function NoteCellRenderer(noteCellProps) {
    const {
        data,
        value,
    } = noteCellProps;
    return (
        <OverlayTrigger
            placement="right"
            overlay={(
                <Tooltip id={`note-tooltip-${data.id}`}>
                    double click to edit
                </Tooltip>
            )}
    >
      <span>{value || '_'}</span>
    </OverlayTrigger>
  );
}

function NoteCellEditor({
  data: row,
  value,
  onValueChange,
  stopEditing,
  context,
}) {
  const [note, setNote] = useState(value);
  const { reactionShortLabel } = context;

  const onClose = () => {
    stopEditing();
  };

    const onSave = () => {
        onValueChange(note);
        stopEditing();
    };

    const cellContent = (
        <Modal show onHide={onClose}>
            <Modal.Header closeButton>
                {`Edit note for ${getVariationsRowName(reactionShortLabel, row.id)}`}
            </Modal.Header>
            <Modal.Body>
                <Form.Control
                    as="textarea"
                    placeholder="Start typing your note..."
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />
            </Modal.Body>
            <Modal.Footer>
                <Button onClick={onSave}>Save</Button>
            </Modal.Footer>
        </Modal>
    );

    return cellContent;
}

NoteCellEditor.propTypes = {
    data: PropTypes.shape({
        id: PropTypes.number.isRequired,
    }).isRequired,
    value: PropTypes.string.isRequired,
    onValueChange: PropTypes.func.isRequired,
    stopEditing: PropTypes.func.isRequired,
    context: PropTypes.shape({
        reactionShortLabel: PropTypes.string.isRequired,
    }).isRequired,
};

function MaterialOverlay({value: cellData}) {
    const {aux = null} = cellData;

    return (
        <div className="tooltip show">
            <div className="tooltip-inner text-start">
                {aux?.isReference && <div>Reference</div>}
                {aux?.coefficient !== null && (
                    <div>
                        Coefficient:
                        {' '}
                        {aux.coefficient.toPrecision(4)}
                    </div>
                )}
                {aux?.molecularWeight !== null && (
                    <div>
                        Molar mass:
                        {' '}
                        {aux.molecularWeight.toPrecision(2)}
                        {' '}
                        g/mol
                    </div>
                )}
                {Object.entries(cellData)
                    .map(
                        ([key, entry]) => (entry && typeof entry === 'object' && 'value' in entry ? (
                            <div key={key}>
                                {`${key.charAt(0)
                                    .toUpperCase() + key.slice(1)}: ${entry.value}${entry.unit ? ` ${entry.unit}` : ''}`}
                            </div>
                        ) : null),
                    )}
            </div>
        </div>
    );
}

MaterialOverlay.propTypes = {
    value: PropTypes.shape({
        value: PropTypes.number.isRequired,
        unit: PropTypes.string.isRequired,
    }).isRequired,
    colDef: PropTypes.shape({
        entryDefs: PropTypes.shape({
            currentEntry: PropTypes.number.isRequired,
            displayUnit: PropTypes.string.isRequired,
        }).isRequired,
    }).isRequired,
};

const toUpperCase = (str) => str.charAt(0)
    .toUpperCase() + str.slice(1);

const formatGroupLabel = (data) => {
    const groupStyles = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    };

    const groupBadgeStyles = {
        backgroundColor: '#EBECF0',
        borderRadius: '2em',
        color: '#172B4D',
        display: 'inline-block',
        fontSize: 12,
        fontWeight: 'normal',
        lineHeight: '1',
        minWidth: 1,
        padding: '0.16666666666667em 0.5em',
        textAlign: 'center',
    };

    return (
        <div style={groupStyles}>
            <span>{data.label}</span>
            <span style={groupBadgeStyles}>{data.options.length}</span>
        </div>
    );
};

function ColumnSelection(selectedColumns, availableColumns, onApply, loading = false) {
    const [showModal, setShowModal] = useState(false);
    const [currentColumns, setCurrentColumns] = useState(selectedColumns);

    const handleApply = () => {
        onApply(currentColumns);
        setShowModal(false);
    };

    const handleSelectChange = (key) => (selectedOptions) => {
        const updatedCurrentColumns = {...currentColumns};
        updatedCurrentColumns[key] = selectedOptions ? selectedOptions.map((option) => option.value) : [];
        setCurrentColumns(updatedCurrentColumns);
    };

    const splitCamelCase = (str) => str.replace(/([a-z])([A-Z])/g, '$1 $2');
    if (loading) {
        return (<div>Loading...</div>);
    }

    const updatedCurrentColumns = Object.fromEntries(
        Object.entries(currentColumns)
            .map(([key, values]) => {
                const {[key]: availableValues} = availableColumns;
                const newValues = values.filter((value) => availableValues.map((x) => x[0])
                    .includes(value));
                return [key, newValues];
            }),
    );

    return (
        <>
            <Button size="sm" variant="primary" onClick={() => setShowModal(true)} className="mb-2">
                Select Columns
            </Button>
            <Modal show={showModal} onHide={() => setShowModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Column Selection</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {Object.entries(availableColumns)
                        .map(([key, values]) => {
                            const groupTitle = toUpperCase(splitCamelCase(key));
                            const groupedOptions = Object.entries(
                                values.reduce((acc, [value, label, groupName]) => {
                                    const groupNameUpdated = groupName ?? groupTitle;
                                    acc[groupNameUpdated] = acc[groupNameUpdated] ?? [];
                                    acc[groupNameUpdated].push({
                                        value,
                                        label,
                                    });
                                    return acc;
                                }, {}),
                            )
                                .map(([label, options]) => ({
                                    label,
                                    options,
                                }));
                            return (
                                <div key={key}>
                                    <h5>{groupTitle}</h5>
                                    <Select
                                        isMulti
                                        options={groupedOptions}
                                        value={updatedCurrentColumns[key]?.map((v) => ({
                                            value: v,
                                            label: values.find((x) => x[0] === v)[1],
                                        })) || []}
                                        onChange={handleSelectChange(key)}
                                        formatGroupLabel={formatGroupLabel}
                                    />
                                </div>
                            );
                        })}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleApply}>
                        Apply
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
}

export {
    RowToolsCellRenderer,
    EquivalentParser,
    SegmentFormatter,
    SegmentParser,
    PropertyFormatter,
    PropertyParser,
    MaterialFormatter,
    MaterialParser,
    GasParser,
    FeedstockParser,
    NoteCellRenderer,
    NoteCellEditor,
    MaterialOverlay,
    ColumnSelection,
    toUpperCase,
};
