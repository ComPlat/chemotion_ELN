import React from 'react';
import { Table } from 'react-bootstrap';

import { iconStatus } from './icon';

const colorStyles = [
  { backgroundColor: '#FFFF00' },
  { backgroundColor: '#87CEFA' },
  { backgroundColor: '#FFB6C1' },
  { backgroundColor: '#00FF00' },
  { backgroundColor: '#E6E6FA' },
  { backgroundColor: '#FFD700' },
  { backgroundColor: '#F0FFFF' },
  { backgroundColor: '#F5F5DC' },
];

const colorLabel = (idx) => {
  const style = Object.assign(
    {},
    colorStyles[idx % 8],
    { width: 20, borderRadius: 20, textAlign: 'center' },
  );

  return (
    <div
      style={style}
    >
      <span
        className="txt-label"
      >
        { idx + 1 }
      </span>
    </div>
  );
};

const tableIr = (fgs) => {
  if (!fgs) return null;

  return (
    <Table responsive striped condensed hover>
      <thead>
        <tr>
          <th>#</th>
          <th>SMARTS</th>
          <th>Machine Confidence</th>
          <th>Machine</th>
          <th>Owner</th>
        </tr>
      </thead>
      <tbody>
        {
          fgs
            .sort((a, b) => b.confidence - a.confidence)
            .map((fg, idx) => (
              <tr key={`${fg}${idx}`}>
                <td>{ colorLabel(idx)}</td>
                <td>{ fg.sma }</td>
                <td>{ fg.confidence } %</td>
                <td>{ iconStatus(fg.status) }</td>
                <td>{ iconStatus(fg.statusOwner) }</td>
              </tr>
            ))
        }
      </tbody>
    </Table>
  );
};

export { tableIr }; // eslint-disable-line
