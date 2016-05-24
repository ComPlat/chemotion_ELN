import React, {Component} from 'react';
import {Tooltip, OverlayTrigger} from 'react-bootstrap';
import Formula from './Formula'
//var _ = require('lodash');

export default class SampleName extends React.Component {
  render() {
    let {sample} = this.props;

    let molecule_name = sample._molecule.iupac_name || (<Formula formula={sample._molecule.sum_formular}/>);
    if(sample.contains_residues) {
      let polymer_name = sample.polymer_type.charAt(0).toUpperCase()
                          + sample.polymer_type.slice(1);
      return (
        <p>
          {polymer_name.replace('_', '-') + ' - '}
          {molecule_name}
        </p>
      )
    } else {
      return <p>{molecule_name}</p>
    }
  }
}
