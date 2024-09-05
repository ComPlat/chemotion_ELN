import React from 'react';
import ElementalComposition from 'src/apps/mydb/elements/details/samples/propertiesTab/ElementalComposition';
import ElementalCompositionCustom from 'src/apps/mydb/elements/details/samples/propertiesTab/ElementalCompositionCustom';

export default class ElementalCompositionGroup extends React.Component {
  handleElementalChanged() {
    this.props.handleSampleChanged(this.props.sample);
  }

  render() {
    const { sample } = this.props;
    if (!sample.molecule_formula) {
      return null;
    }

    const { elemental_compositions } = sample;

    let display_error = true;
    let data = [];
    let el_composition_custom;

    if (elemental_compositions.length == 1) {
      data = '';
      display_error = false;
    } else if (sample.formulaChanged) {
      data = (
        <p>
          Formula has been changed. Please save sample to calculate the
          elemental compositon.
        </p>
      );
    }

    elemental_compositions.map((elemental_composition) => {
      if (Object.keys(elemental_composition.data).length) { display_error = false; }

      if (elemental_composition.composition_type == 'found') {
        el_composition_custom = elemental_composition;
      } else if (data.constructor === Array) {
        data.push(
          <ElementalComposition
            elemental_composition={elemental_composition}
            key={elemental_composition.id}
          />
        );
      }
    });

    if (display_error) {
      data = (
        <p>
          Sorry, it was not possible to calculate the elemental
          compositon. Check data please.
        </p>
      );
    }

    return (
      <div>
        {sample.contains_residues && 'Elemental composition'}
        <div className="d-flex flex-column gap-3">
          {data}
          {sample.can_update && (
            <ElementalCompositionCustom
              handleElementalChanged={() => this.handleElementalChanged()}
              elemental_composition={el_composition_custom}
              hideLoading={!sample.contains_residues}
              concat_formula={sample.concat_formula}
              key="elem_composition_found"
            />
          )}
        </div>
      </div>
    );
  }
}
