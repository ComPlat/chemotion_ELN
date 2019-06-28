import React from 'react';
import { Table } from 'react-bootstrap';

import { iconStatus } from './icon';

const tableIr = (irQc) => {
  const qc = irQc.pred.output.result[0];

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
          qc.fgs
            .sort((a, b) => b.confidence - a.confidence)
            .map((fg, idx) => (
              <tr key={`${fg}${idx}`}>
                <td>{ idx + 1 }</td>
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
