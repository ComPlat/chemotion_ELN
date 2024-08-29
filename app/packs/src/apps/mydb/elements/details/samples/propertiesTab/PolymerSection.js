import React from 'react';
import PropTypes from 'prop-types';
import { Form, Row, Col } from 'react-bootstrap';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo'
import ElementalCompositionGroup from 'src/apps/mydb/elements/details/samples/propertiesTab/ElementalCompositionGroup'
import NotificationActions from 'src/stores/alt/actions/NotificationActions'
import Select from 'react-select'

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


  checkInputStatus(sample, key) {
    if (sample['error_' + key]) {
      return 'error';
    } else {
      return 'success';
    }
  }

  polymerFormula(sample, residue) {
    return (
      <Form.Group>
        <Form.Label>Formula</Form.Label>
        <Form.Control
          type="text"
          value={residue.custom_info.formula || ''}
          name="formula"
          onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
        />
      </Form.Group>
    )
  }

  customInfoRadio(label, value, residue, sample) {
    let additionalLoadingInput = false;

    if (value == 'external') {
      let disabled = !(residue.custom_info.loading_type == value);
      additionalLoadingInput = (
        <td width="50%" className="loading-input visible-hd">
          <NumeralInputWithUnitsCompo
            value={sample.loading}
            unit='mmol/g'
            metricPrefix='n'
            metricPrefixes={['n']}
            precision={3}
            name="polymer_loading"
            // TODO: enable again
            //variant={this.checkInputStatus(sample, 'loading')}
            onChange={(e) => this.handleCustomInfoNumericChanged(e, 'loading', residue, sample)}
            disabled={disabled}
            readOnly={disabled}
          />
        </td>
      )
    }

    let rel_composition = sample.elemental_compositions.find(function (item) {
      return item.composition_type == value
    });
    let rel_loading = rel_composition && rel_composition.loading;

    return (
      <tr>
        <td>
          <Form.Group>
            <Form.Check
              type="radio"
              onChange={(e) => this.handlePRadioChanged(e, residue, sample)}
              checked={residue.custom_info.loading_type == value}
              name="loading_type"
              value={value}
              disabled={value != 'external' && !rel_loading}
              label={label}
            />
          </Form.Group>
        </td>
        {additionalLoadingInput}
      </tr>
    )
  }

  polymerLoading(sample, residue) {
    if (sample.reaction_product)
      return false;

    return (
      <table width="100%">
        <thead>
          <tr>
            <th>
              <label>Loading according to:</label>
            </th>
          </tr>
        </thead>
        <tbody>
          {this.customInfoRadio("Mass difference", "mass_diff", residue, sample)}
          {this.customInfoRadio("100% conversion", "full_conv", residue, sample)}
          {this.customInfoRadio("Elemental analyses", "found", residue, sample)}
          {this.customInfoRadio("External estimation", "external", residue, sample)}
          <tr className="hidden-hd">
            <td>
              <NumeralInputWithUnitsCompo
                value={sample.loading}
                unit='mmol/g'
                metricPrefix='n'
                metricPrefixes={['n']}
                precision={3}
                name="polymer_loading"
                variant={this.checkInputStatus(sample, 'loading')}
                onChange={(e) => this.handleCustomInfoNumericChanged(e, 'loading', residue, sample)}
                disabled={residue.custom_info.loading_type != 'external'}
                readOnly={residue.custom_info.loading_type != 'external'}
              />
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  polymerType(sample, residue) {
    let selectOptions = [
      { label: 'Polystyrene', value: 'polystyrene' },
      { label: 'Polyethyleneglycol', value: 'polyethyleneglycol' },
      { label: 'Self-defined', value: 'self_defined' }
    ];

    return (
      <Select
        options={selectOptions}
        simpleValue
        name="polymer_type"
        value={residue.custom_info.polymer_type}
        clearable={false}
        onChange={(v) => this.handlePolymerTypeSelectChanged(v, residue, sample)}
      />
    )
  }

  surfaceType(sample, residue) {
    let selectOptions = [
      { label: 'Glass', value: 'glass' },
      { label: 'Si native oxide', value: 'si Native Oxide' },
      { label: 'Si, 5nm Ti, 100nm Au', value: 'si, 5nm Ti, 100nm Au' }
    ];

    return (
      <Select
        options={selectOptions}
        simpleValue
        name="surface_type"
        value={residue.custom_info.surface_type}
        clearable={false}
        onChange={(v) => this.handleSurfaceTypeSelectChanged(v, residue, sample)}
      />
    )
  }

  polymerCrossLinkage(sample, residue) {
    return (
      <Form.Group>
        <Form.Label>Cross-linkage</Form.Label>
        <Form.Control
          type="text"
          value={residue.custom_info.cross_linkage || ''}
          name="cross_linkage"
          onChange={(e) => this.handleCustomInfoChanged(e, residue, sample)}
        />
      </Form.Group>
    )
  }

  render() {
    const { sample = {}, handleSampleChanged } = this.props;
    const residue = sample.residues[0];

    return (
      <div className="polymer-section">
        <Row>
          <Col md={6}>
            <label>Polymer type</label>
            {this.polymerType(sample, residue)}
          </Col>
          <Col md={6}>
            <label>Surface type</label>
            {this.surfaceType(sample, residue)}
          </Col>
        </Row>
        <br />
        <Row>
          <Col md={6}>
            {this.polymerCrossLinkage(sample, residue)}
          </Col>
          <Col md={6}>
            {this.polymerFormula(sample, residue)}
          </Col>
        </Row>
        <Row>
          <Col md={8}>
            <ElementalCompositionGroup
              handleSampleChanged={handleSampleChanged}
              sample={sample}
            />
          </Col>
          <Col md={4}>
            {this.polymerLoading(sample, residue)}
          </Col>
        </Row>
      </div>
    )
  }
}

PolymerSection.propTypes = {
  sample: PropTypes.object.isRequired,
  handleAmountChanged: PropTypes.func.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
};
