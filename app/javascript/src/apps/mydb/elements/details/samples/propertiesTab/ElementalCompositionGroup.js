import React from 'react';
import PropTypes from 'prop-types';
import ElementalComposition from 'src/apps/mydb/elements/details/samples/propertiesTab/ElementalComposition';
import ElementalCompositionCustom from
  'src/apps/mydb/elements/details/samples/propertiesTab/ElementalCompositionCustom';
import ElementalCompositionTable from
  'src/apps/mydb/elements/details/samples/propertiesTab/ElementalCompositionTable';

export default class ElementalCompositionGroup extends React.Component {
  constructor(props) {
    super(props);
    this.handleElementalChanged = this.handleElementalChanged.bind(this);
    this.handleExperimentalChange = this.handleExperimentalChange.bind(this);
  }

  handleElementalChanged() {
    const { handleSampleChanged, sample } = this.props;
    handleSampleChanged(sample);
  }

  handleExperimentalChange(updatedComposition) {
    const { sample } = this.props;
    const elementalCompositions = [...sample.elemental_compositions];

    const foundIndex = elementalCompositions.findIndex(
      (comp) => comp.composition_type === 'found'
    );

    if (foundIndex !== -1) {
      elementalCompositions[foundIndex] = updatedComposition;
      sample.elemental_compositions = elementalCompositions;
      this.handleElementalChanged();
    }
  }

  render() {
    const { sample } = this.props;

    if (!sample.molecule_formula) {
      return null;
    }

    const { elemental_compositions: elementalCompositions } = sample;

    let displayError = true;
    let data = [];
    let elCompositionCustom;
    let theoreticalComposition;
    let experimentalComposition;

    if (elementalCompositions.length === 1) {
      data = '';
      displayError = false;
    } else if (sample.formulaChanged) {
      data = (
        <p>
          Formula has been changed. Please save sample to calculate the
          elemental compositon.
        </p>
      );
    }

    // Find theoretical and experimental compositions
    elementalCompositions.forEach((elementalComposition) => {
      if (Object.keys(elementalComposition.data).length) {
        displayError = false;
      }

      if (elementalComposition.composition_type === 'found') {
        elCompositionCustom = elementalComposition;
        experimentalComposition = elementalComposition;
      } else if (elementalComposition.composition_type === 'formula') {
        theoreticalComposition = elementalComposition;
      } else if (data.constructor === Array) {
        data.push(
          <ElementalComposition
            elemental_composition={elementalComposition}
            key={elementalComposition.id}
          />
        );
      }
    });

    // Use new table format if we have both theoretical and experimental data
    const useTableFormat = theoreticalComposition && experimentalComposition;

    if (displayError) {
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
          {useTableFormat ? (
            <ElementalCompositionTable
              theoreticalComposition={theoreticalComposition}
              experimentalComposition={experimentalComposition}
              onExperimentalChange={this.handleExperimentalChange}
              loading={experimentalComposition?.loading}
              readOnly={!sample.can_update}
            />
          ) : (
            <>
              {data}
              {sample.can_update && elCompositionCustom && (
                <ElementalCompositionCustom
                  handleElementalChanged={() => this.handleElementalChanged()}
                  elemental_composition={elCompositionCustom}
                  hideLoading={!sample.contains_residues}
                  concat_formula={sample.concat_formula}
                  key="elem_composition_found"
                />
              )}
            </>
          )}
        </div>
      </div>
    );
  }
}

ElementalCompositionGroup.propTypes = {
  sample: PropTypes.shape({
    molecule_formula: PropTypes.string,
    elemental_compositions: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.number,
      composition_type: PropTypes.string,
      data: PropTypes.objectOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
      description: PropTypes.string,
      loading: PropTypes.number,
    })),
    contains_residues: PropTypes.bool,
    can_update: PropTypes.bool,
    formulaChanged: PropTypes.bool,
    concat_formula: PropTypes.string,
  }).isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
};
