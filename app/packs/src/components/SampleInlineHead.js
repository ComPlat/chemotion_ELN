import React, { Component } from 'react';


export default class SampleInlineHead extends Component {

  render() {
    return (
      <React.Fragment>
        <th style={{ width: 200 }}>Sample</th>
        <th style={{ width: 200 }}>Molecule</th>
        <th style={{ width: 100 }}>Stereo Abs</th>
        <th style={{ width: 100 }}>Stereo Rel</th>
        <th style={{ width: 40 }} className="text-center">TS</th>
        <th style={{ width: 150 }}>Name</th>
        <th style={{ width: 150 }}>External label</th>
        <th style={{ width: 150 }}>Solvent</th>
        <th style={{ width: 260 }}>Amount</th>
        <th style={{ width: 100 }}>Density</th>
        <th style={{ width: 100 }}>Molarity</th>
        <th style={{ width: 100 }}>Purity</th>
        <th style={{ width: 100 }}>Boiling point</th>
        <th style={{ width: 100 }}>Melting point</th>
        <th style={{ width: 100 }}>Description</th>
        <th style={{ width: 100 }}>Location</th>
        <th style={{ width: 150 }}>CAS</th>
      </React.Fragment>
    )
  }

}
