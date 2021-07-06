import React from 'react';
import { Table } from 'react-bootstrap';

import { iconStatus } from './icon';
import { numFormat, realFormat } from '../../utils/common';

const tableNmr = (shifts = []) => (
  <Table responsive striped condensed hover>
    <thead>
      <tr>
        <th>Atom</th>
        <th>Prediction (ppm)</th>
        <th>Real (ppm)</th>
        <th>Diff (ppm)</th>
        <th>Machine</th>
        <th>Owner</th>
      </tr>
    </thead>
    <tbody>
      {
        shifts
          .sort((a, b) => a.atom - b.atom)
          .map((s, idx) => (
            <tr key={`${s.atom}${idx}`}>
              <td>{ s.atom }</td>
              <td>{ numFormat(s.prediction) }</td>
              <td>{ realFormat(s.real, s.status) }</td>
              <td>{ realFormat(s.diff, s.status) }</td>
              <td>{ iconStatus(s.status) }</td>
              <td>{ iconStatus(s.statusOwner) }</td>
            </tr>
          ))
      }
    </tbody>
  </Table>
);

const formatQV = (ops) => {
  if (ops[0].insert === '\n') return ops.slice(1);
  return ops;
};

export {
  tableNmr,
  formatQV,
};
