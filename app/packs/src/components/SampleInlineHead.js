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
        <th style={{ width: 300 }}>Amount</th>
        <th style={{ width: 140 }}>Density</th>
        <th style={{ width: 100 }}>Molarity</th>
        <th style={{ width: 80 }}>Purity</th>
        <th style={{ width: 140 }}>Boiling point</th>
        <th style={{ width: 140 }}>Melting point</th>
        <th style={{ width: 200 }}>Description</th>
        <th style={{ width: 100 }}>Location</th>
        <th style={{ width: 150 }}>CAS</th>
      </React.Fragment>
    )
  }

}
