import React from 'react';
import PropTypes from 'prop-types';
import { Form, Row, Col } from 'react-bootstrap';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo'
import ElementalCompositionGroup from 'src/apps/mydb/elements/details/samples/propertiesTab/ElementalCompositionGroup'
import NotificationActions from 'src/stores/alt/actions/NotificationActions'
import { Select } from 'src/components/common/Select';

export default class PolymerSection extends React.Component {
  handleCustomInfoNumericChanged(e, name, residue, sample) {
    const { handleSampleChanged, handleAmountChanged } = this.props;
    residue.custom_info[name] = e.value;

    // make calculations if loading was changed
    if (name == 'loading') {
      handleAmountChanged(sample.amount);
      if (residue.custom_info.loading_type == 'external')
        sample.external_loading = e.value;

      let errorMessage;
      if (e.value == 0.0)
        errorMessage = 'Loading can not be 0. Please define a value.'

      let mw_defined = sample.molecule.molecular_weight;
      let value_to_check = e.value * mw_defined;

      if (value_to_check > 1000.0) {
        errorMessage = 'Combination of loading and molecular weight is wrong\
         (MW*L > 1.0)'
      }

      if (errorMessage)
        NotificationActions.add({
          message: errorMessage,
          level: 'error'
        });

    } else {
      handleSampleChanged(sample);
    }
  }

  handleCustomInfoChanged(e, residue, sample) {
    residue.custom_info[e.target.name] = e.target.value;

    if (e.target.name == "formula") {
      if (e.target.value) {
        sample.formulaChanged = true;
      }
    }

    this.props.handleSampleChanged(sample);
  }

  handlePRadioChanged(e, residue, sample) {
    residue.custom_info['loading_type'] = e.target.value;

    if (e.target.value == 'external') {
      sample.loading = sample.external_loading;
    }
    else {
      let e_compositon = sample.elemental_compositions.find(function (item) {
        return item.composition_type == e.target.value
      });

      if (e_compositon)
        sample.loading = e_compositon.loading;
    }

    this.props.handleSampleChanged(sample);
  }

  handlePolymerTypeSelectChanged(value, residue, sample) {
    residue.custom_info['polymer_type'] = value;
    delete residue.custom_info['surface_type'];

    this.props.handleSampleChanged(sample);
  }

  handleSurfaceTypeSelectChanged(value, residue, sample) {
    residue.custom_info['surface_type'] = value;
    delete residue.custom_info['polymer_type'];

    this.props.handleSampleChanged(sample);
  }

  customInfoRadio(label, value, residue, sample) {
    const relComposition = sample.elemental_compositions
      .find((item) => item.composition_type === value);
    const relLoading = relComposition?.loading;

    return (
      <Form.Check
        type="radio"
        id={`polymer-loading_type-${value}`}
        onChange={(e) => this.handlePRadioChanged(e, residue, sample)}
        checked={residue.custom_info.loading_type === value}
        name="loading_type"
        value={value}
        disabled={value !== 'external' && !relLoading}
        label={label}
      />
    );
  }

  polymerLoading(sample, residue) {
    return (
      <div>
        <h5>Loading according to:</h5>
        {this.customInfoRadio('Mass difference', 'mass_diff', residue, sample)}
        {this.customInfoRadio('100% conversion', 'full_conv', residue, sample)}
        {this.customInfoRadio('Elemental analyses', 'found', residue, sample)}
        {this.customInfoRadio('External estimation', 'external', residue, sample)}
        <NumeralInputWithUnitsCompo
          value={sample.loading}
          unit="mmol/g"
          metricPrefix="n"
          metricPrefixes={['n']}
          precision={3}
          name="polymer_loading"
          variant="primary"
          onChange={(e) => this.handleCustomInfoNumericChanged(e, 'loading', residue, sample)}
          disabled={residue.custom_info.loading_type !== 'external'}
        />
      </div>
    );
  }

  render() {
    const { sample = {}, handleSampleChanged } = this.props;
    const residue = sample.residues[0];

    const polymerTypeOptions = [
      { label: 'Polystyrene', value: 'polystyrene' },
      { label: 'Polyethyleneglycol', value: 'polyethyleneglycol' },
      { label: 'Self-defined', value: 'self_defined' },
    ];

    const surfaceTypeOptions = [
      { label: 'Glass', value: 'glass' },
      { label: 'Si native oxide', value: 'si Native Oxide' },
      { label: 'Si, 5nm Ti, 100nm Au', value: 'si, 5nm Ti, 100nm Au' },
    ];

    return (
      <div className="polymer-section">
        <Row>
          <Col md={6}>
            <Form.Label>Polymer type</Form.Label>
            <Select
              options={polymerTypeOptions}
              name="polymer_type"
              value={polymerTypeOptions.find(({value}) => value === residue.custom_info.polymer_type)}
              onChange={(v) => this.handlePolymerTypeSelectChanged(v.value, residue, sample)}
            />
          </Col>
          <Col md={6}>
            <Form.Label>Surface type</Form.Label>
            <Select
              options={surfaceTypeOptions}
              name="surface_type"
              value={surfaceTypeOptions.find(({value}) => value === residue.custom_info.surface_type)}
              onChange={(v) => this.handleSurfaceTypeSelectChanged(v.value, residue, sample)}
            />
          </Col>
        </Row>

        <Row className="mt-3">
          <Col md={6}>
            <Form.Group>
              <Form.Label>Cross-linkage</Form.Label>
              <Form.Control
                type="text"
                value={residue.custom_info.cross_linkage || ''}
                name="cross_linkage"
                onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
              />
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Formula</Form.Label>
              <Form.Control
                type="text"
                value={residue.custom_info.formula || ''}
                name="formula"
                onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
              />
            </Form.Group>
          </Col>
        </Row>

        <Row className="mt-3">
          <Col xs={8}>
            <ElementalCompositionGroup
              handleSampleChanged={handleSampleChanged}
              sample={sample}
            />
          </Col>
          {!sample.reaction_product && (
            <Col xs={4}>
              {this.polymerLoading(sample, residue)}
            </Col>
          )}
        </Row>
      </div>
    );
  }
}

PolymerSection.propTypes = {
  sample: PropTypes.object.isRequired,
  handleAmountChanged: PropTypes.func.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
};
