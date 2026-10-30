import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, InputGroup, Table
} from 'react-bootstrap';

const TIME_PATTERN = /^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/;
const VALUE_PATTERN = /^-?\d+(?:[.,]\d+)?$/;

export const normalizeTime = (text) => {
  const match = TIME_PATTERN.exec(String(text).trim());
  if (!match) return null;

  const [, hours, minutes, seconds = '0'] = match;
  return [hours, minutes, seconds].map((part) => part.padStart(2, '0')).join(':');
};

export const normalizeValue = (text) => {
  const value = String(text).trim();
  return VALUE_PATTERN.test(value) ? value.replace(',', '.') : null;
};

const toSeconds = (time) => String(time).split(':').reduce((sum, part) => (sum * 60) + Number(part), 0);

export const sortByTime = (rows) => [...rows].sort((a, b) => toSeconds(a.time) - toSeconds(b.time));

const NEW_ROW = { time: '00:00:00', value: '' };

const EditableTable = ({ temperature, updateTemperature, otherStepRows }) => {
  const [draft, setDraft] = useState(NEW_ROW);
  const rows = sortByTime(temperature.data);
  const showSteps = otherStepRows.length > 0;
  const entries = sortByTime([...rows.map((row, index) => ({ ...row, index, step: 1 })), ...otherStepRows]);
  const draftTime = normalizeTime(draft.time);
  const draftValue = normalizeValue(draft.value);

  const commitCell = (index, field, normalize) => (event) => {
    const normalized = normalize(event.target.value);
    if (normalized === null || normalized === rows[index][field]) {
      event.target.value = rows[index][field];
      return;
    }
    updateTemperature(sortByTime(rows.map((row, i) => (i === index ? { ...row, [field]: normalized } : row))));
  };

  const addRow = () => {
    if (draftTime === null || draftValue === null) return;
    updateTemperature(sortByTime([...rows, { time: draftTime, value: draftValue }]));
    setDraft(NEW_ROW);
  };

  const units = { time: 'h:m:s', value: temperature.valueUnit };
  const withUnit = (field, control) => (
    <InputGroup size="sm">
      {control}
      <InputGroup.Text>{units[field]}</InputGroup.Text>
    </InputGroup>
  );
  const cell = (row, field, normalize) => (row.index === undefined ? row[field] : withUnit(field, (
    <Form.Control
      key={`${field}-${row[field]}`}
      defaultValue={row[field]}
      aria-label={field}
      onBlur={commitCell(row.index, field, normalize)}
      onKeyDown={(event) => event.key === 'Enter' && event.target.blur()}
    />
  )));

  return (
    <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
      <Table size="sm" className="mb-0">
        <thead>
          <tr>
            {showSteps && <th>Step</th>}
            <th>Time (hh:mm:ss)</th>
            <th>{`Temperature (${temperature.valueUnit})`}</th>
            <th aria-label="actions" />
          </tr>
        </thead>
        <tbody>
          {entries.map((row, position) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={position}>
              {showSteps && <td>{row.step}</td>}
              <td>{cell(row, 'time', normalizeTime)}</td>
              <td>{cell(row, 'value', normalizeValue)}</td>
              <td>
                {row.index !== undefined && (
                  <Button
                    size="sm"
                    variant="light"
                    aria-label="Remove row"
                    onClick={() => updateTemperature(rows.filter((_, i) => i !== row.index))}
                  >
                    <i className="fa fa-minus" />
                  </Button>
                )}
              </td>
            </tr>
          ))}
          <tr className="table-light">
            {showSteps && <td>1</td>}
            <td>
              {withUnit('time', (
                <Form.Control
                  placeholder="New time"
                  aria-label="New time"
                  value={draft.time}
                  isInvalid={draft.time !== '' && draftTime === null}
                  onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                  onKeyDown={(event) => event.key === 'Enter' && addRow()}
                />
              ))}
            </td>
            <td>
              {withUnit('value', (
                <Form.Control
                  placeholder="New temperature"
                  aria-label="New temperature"
                  value={draft.value}
                  isInvalid={draft.value !== '' && draftValue === null}
                  onChange={(event) => setDraft({ ...draft, value: event.target.value })}
                  onKeyDown={(event) => event.key === 'Enter' && addRow()}
                />
              ))}
            </td>
            <td>
              <Button
                size="sm"
                variant="success"
                aria-label="Add row"
                disabled={draftTime === null || draftValue === null}
                onClick={addRow}
              >
                <i className="fa fa-plus" />
              </Button>
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
};

EditableTable.propTypes = {
  temperature: PropTypes.shape({
    valueUnit: PropTypes.string,
    data: PropTypes.arrayOf(PropTypes.shape({
      time: PropTypes.string,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })),
  }).isRequired,
  updateTemperature: PropTypes.func.isRequired,
  otherStepRows: PropTypes.arrayOf(PropTypes.shape({
    step: PropTypes.number,
    time: PropTypes.string,
    value: PropTypes.string,
  })),
};

EditableTable.defaultProps = {
  otherStepRows: [],
};

export default EditableTable;
