import React, {Component} from 'react';
import {Input, ListGroup, ListGroupItem, Button} from 'react-bootstrap';
import ElementalComposition from './ElementalComposition'
import ElementalCompositionCustom from './ElementalCompositionCustom'

export default class ElementalCompositionGroup extends React.Component {

  render() {
    let {sample, show} = this.props;
    let elemental_compositions = sample.elemental_compositions;

    let display_error = true;
    let data = [];
    let el_composition_custom;

    if (elemental_compositions.length == 1){
      data = '';
      display_error = false;
    }
    else if (sample.formulaChanged)
      data = (
        <p>
          Formula has been changed. Please save sample to calculate the
          elemental compositon.
        </p>
      )

    elemental_compositions.map((elemental_composition, key) => {
      if(Object.keys(elemental_composition.data).length)
        display_error = false;

      if(elemental_composition.composition_type == 'found') {
        el_composition_custom = elemental_composition;
      } else {
        if(data.constructor === Array)
          data.push(
            <ElementalComposition
            elemental_composition={elemental_composition}
            key={elemental_composition.id}/>
          );
      }
    });

    if(display_error) {
      data = (
        <p>
          Sorry, it was not possible to calculate the elemental
          compositon. Check data please.
        </p>
      )
    }

    if (!sample.molecule.sum_formular) {
      return false;
    } else {
      let label = sample.contains_residues ? <label>Elemental composition</label> : false
      return (
        <div>
          {label}
          {data}
          <ElementalCompositionCustom
            elemental_composition={el_composition_custom}
            hideLoading={!sample.contains_residues}
            concat_formula={sample.concat_formula}
            key={'elem_composition_found'}/>
        </div>
      )
    }
  }
}
