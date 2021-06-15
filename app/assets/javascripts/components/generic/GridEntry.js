/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';

const setCell = (columnDef, rowValue) => {
  const {
    type, field, onCellChange, cellRenderer, cellParams
  } = columnDef;
  switch (type) {
    case 'text':
      return (
        <FormControl type="text" value={rowValue[field] || ''} onChange={e => onCellChange({ e, columnDef, rowValue })} />
      );
    case 'system-defined':
      return (
        <InputGroup>
          <FormControl type="number" value={rowValue[field].value || ''} onChange={e => onCellChange({ e, columnDef, rowValue })} />
          <InputGroup.Button>
            {cellRenderer({ ...cellParams, node: { data: rowValue } })}
          </InputGroup.Button>
        </InputGroup>
      );
    default:
      return <span />;
  }
};

const ColumnHeader = (columnDefs) => {
  const ch = [];
  const h = (col) => {
    const {
      width, headerName, headerComponent, headerParams
    } = col;
    const colCss = {};
    if (width) { Object.assign(colCss, { width }); }
    return (
      <div key={`column_header_${col.colId || col.field}`} className="generic_grid_header" style={colCss}>
        {headerComponent ? headerComponent(headerParams) : null}
        {headerName}
      </div>
    );
  };
  columnDefs.forEach(col => ch.push(h(col)));
  return (<div className="generic_grid" style={{ borderBottom: '1px solid #ccc' }}><div>{ch}</div></div>);
};

const ColumnRow = (columnDefs, rowValue) => {
  const ch = [];
  const h = (col, val) => {
    const {
      field, width, cellParams, cellRenderer
    } = col;
    const colCss = {};
    if (width) { Object.assign(colCss, { width }); }
    return (
      <div key={`column_row_${val.id}_${col.colId || col.field}`} className="generic_grid_row" style={colCss}>
        {field ? (setCell(col, val) || '') : (cellRenderer({ ...cellParams, node: { data: val } }) || '')}
      </div>
    );
  };
  columnDefs.forEach(col => ch.push(h(col, rowValue)));
  return (<div key={`column_row_${rowValue.id}`} className="generic_grid"><div>{ch}</div></div>);
};

const NoRow = (values) => {
  if (values && values.length > 0) return null;
  return (<div className="generic_grid"><div><div className="generic_grid_row" style={{ width: '100%' }}>(No data)</div></div></div>);
};

export { ColumnHeader, ColumnRow, NoRow };
