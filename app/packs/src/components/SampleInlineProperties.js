import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Button, FormGroup, FormControl } from 'react-bootstrap';

import ElementActions from './actions/ElementActions'

import StructureEditorModal from './structure_editor/StructureEditorModal';
import MoleculesFetcher from './fetchers/MoleculesFetcher';
import SvgWithPopover from './common/SvgWithPopover';

import { SampleMoleculeInput, SampleStereoAbsInput, SampleStereoRelInput,
         SampleTopSecretCheckbox, SampleTextInput, SampleSolventInput,
         SampleNumeralInput, SampleBoilingPointInput, SampleMeltingPointInput,
         SampleAmountInput, SampleDescriptionInput, SampleCASInput } from './SampleInput'

export default class SampleInlineProperties extends Component {

  constructor(props) {
    super(props);
    this.state = {
      showStructureEditor: false,
      loadingMolecule: false,
      molarityBlocked: (props.sample.molarity_value || 0) <= 0
    }

    this.showStructureEditor = this.showStructureEditor.bind(this)
    this.hideStructureEditor = this.hideStructureEditor.bind(this)
    this.handleStructureEditorSave = this.handleStructureEditorSave.bind(this)
    this.handleMoleculeChanged = this.handleMoleculeChanged.bind(this)
    this.handleAmountChanged = this.handleAmountChanged.bind(this)
    this.handleDensityChanged = this.handleDensityChanged.bind(this)
    this.handleMolarityChanged = this.handleMolarityChanged.bind(this)
  }

  showStructureEditor() {
    this.setState({
      showStructureEditor: true
    })
  }

  hideStructureEditor() {
    this.setState({
      showStructureEditor: false
    })
  }

  handleStructureEditorSave(molfile, svg_file = null, config = null) {
    const { sample } = this.props;
    const smiles = (config && sample.molecule) ? config.smiles : null;
    const sampleProperties = {
      molfile: molfile,
      contains_residues: molfile.indexOf(' R# ') > -1,
      formulaChanged: true
    }

    if (!smiles || smiles === '') {
      this.setState({ loadingMolecule: true });
      MoleculesFetcher.fetchByMolfile(molfile, svg_file)
        .then((result) => {
          sampleProperties.molecule = result;
          sampleProperties.molecule_id = result.id;
          this.setState({ loadingMolecule: false });
          ElementActions.changeElementProperties(sample, sampleProperties)
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    } else {
      this.setState({ loadingMolecule: true });
      MoleculesFetcher.fetchBySmi(smiles, svg_file, molfile)
        .then((result) => {
          sampleProperties.molecule = result;
          sampleProperties.molecule_id = result.id;
          this.setState({ loadingMolecule: false });
          ElementActions.changeElementProperties(sample, sampleProperties)
        });
    }
    this.hideStructureEditor();
  }

  handleStructureEditorCancel() {
    this.hideStructureEditor();
  }

  handleMoleculeChanged(value) {
    const { sample } = this.props;
    ElementActions.changeElementProperties(sample, {
      field: value,
      formulaChanged: true
    })
  }

  handleAmountChanged(amount) {
    const { sample } = this.props;
    ElementActions.callElementMethod(sample, 'setAmount', [amount])
  }

  handleDensityChanged(density) {
    const { sample } = this.props;
    ElementActions.callElementMethod(sample, 'setDensity', [density])
    this.setState({ molarityBlocked: true });
  }

  handleMolarityChanged(molarity) {
    const { sample } = this.props;
    ElementActions.callElementMethod(sample, 'setMolarity', [molarity])
    this.setState({ molarityBlocked: false });
  }

  handleMolecularMassChanged(mass) {
    const { sample } = this.props;
    ElementActions.callElementMethod(sample, 'setMolecularMass', [mass])
  }

  renderStructureEditorModal() {
    const { sample } = this.props;

    const molfile = sample.molfile;
    const hasParent = Boolean(sample && sample.parent_id);
    const hasChildren = sample && sample.children_count > 0;

    return(
      <StructureEditorModal
        key={sample.id}
        showModal={this.state.showStructureEditor}
        onSave={this.handleStructureEditorSave.bind(this)}
        onCancel={this.handleStructureEditorCancel.bind(this)}
        molfile={molfile}
        hasParent={hasParent}
        hasChildren={hasChildren} />
    )
  }

  renderButtons() {
    const { sample, onCopy, onSave } = this.props;

    return (
      <FormGroup>
        {!sample.isNew && <Button bsSize="xsmall" bsStyle="success" style={{marginRight: 5}}
          onClick={(event) => onCopy(event, sample)}>
          <i className="fa fa-clone" />
        </Button>}
        <Button bsSize="xsmall" bsStyle="warning" disabled={!sample.isValid}
          onClick={(event) => onSave(event, [sample], sample.type)}>
          <i className="fa fa-floppy-o" />
        </Button>
      </FormGroup>
    )
  }

  render() {
    const { sample, showDetails } = this.props

    const sampleTitle = sample.isNew ? <i>{sample.title()}</i> : sample.title()
    const isPolymer = (sample.molfile || '').indexOf(' R# ') !== -1;
    const isDisabled = !sample.can_update;
    const polyDisabled = isPolymer || isDisabled;
    const molarityBlocked = isDisabled ? true : this.state.molarityBlocked;
    const densityBlocked = isDisabled ? true : !molarityBlocked;
    // const { enableSampleDecoupled } = this.props;

    const onChange = (field, value) => ElementActions.changeElementProperty(sample, field, value)
    const onChangeNumeral = (field, state) => ElementActions.changeElementProperty(sample, field, state.value)
    const onChangeMolecule = (field, value) => this.handleMoleculeChanged(field, value)
    const onChangeAmount = (field, state) => this.handleAmountChanged(state)
    const onChangeDensity = (field, state) => this.handleDensityChanged(state)
    const onChangeMolarity = (field, state) => this.handleMolarityChanged(state)
    const onChangeRange = (field, lower, upper) => ElementActions.callElementMethod(sample, 'updateRange', [field, lower, upper])

    const updateMoleculeNames = (newMolName) => ElementActions.updateMoleculeNamesInline(sample, newMolName)
    const updateMoleculeCas = (value) => ElementActions.updateMoleculeCasInline(sample, value)

    return (
      <tr>
        <td style={{ cursor: 'pointer' }} onClick={() => showDetails(sample)}>
          <SvgWithPopover
            hasPop
            previewObject={{
              txtOnly: sampleTitle,
              isSVG: true,
              src: sample.svgPath
            }}
            popObject={{
              title: sample.molecule_iupac_name,
              src: sample.svgPath,
              height: '100px',
              width: '200px',
            }}
          />
        </td>
        <td>
          <SampleMoleculeInput sample={sample} inline={true} disabled={isDisabled} onChange={onChange}
                               updateMoleculeNames={updateMoleculeNames} showStructureEditor={this.showStructureEditor} />
        </td>
        <td>
          <SampleStereoAbsInput sample={sample} inline={true} disabled={isDisabled} onChange={onChange} />
        </td>
        <td>
          <SampleStereoRelInput sample={sample} inline={true} disabled={isDisabled} onChange={onChange} />
        </td>
        <td>
          <SampleTopSecretCheckbox sample={sample} inline={true} disabled={isDisabled} onChange={onChange} />
        </td>
        <td>
          <SampleTextInput sample={sample} inline={true} disabled={isDisabled} onChange={onChange}
                           field="name" />
        </td>
        <td>
          <SampleTextInput sample={sample} inline={true} disabled={isDisabled} onChange={onChange}
                           field="external_label" />
        </td>
        <td>
          <table>
            <tbody>
              <tr>
                <SampleAmountInput sample={sample} inline={true} disabled={polyDisabled} onChange={onChangeAmount} />
              </tr>
            </tbody>
          </table>
        </td>
        <td>
          <SampleNumeralInput sample={sample} inline={true} disabled={polyDisabled} onChange={onChangeDensity}
                              field="density" unit="g/ml" prefixes={['n']} precision={5} block={densityBlocked} notApplicable={isPolymer} />
        </td>
        <td>
          <SampleNumeralInput sample={sample} inline={true} disabled={polyDisabled} onChange={onChangeMolarity}
                              field="molarity" unit="M" prefixes={['n']} precision={5} block={molarityBlocked} notApplicable={isPolymer} />
        </td>
        <td>
          <SampleNumeralInput sample={sample} inline={true} disabled={isDisabled} onChange={onChangeNumeral}
                              field="purity" unit="n" prefixes={['n']} precision={5} />
        </td>
        <td>
          <SampleBoilingPointInput sample={sample} inline={true} disabled={isDisabled} onChange={onChangeRange} />
        </td>
        <td>
          <SampleMeltingPointInput sample={sample} inline={true} disabled={isDisabled} onChange={onChangeRange} />
        </td>
        <td>
          <SampleDescriptionInput sample={sample} inline={true} disabled={isDisabled} onChange={onChange} />
        </td>
        <td>
          <SampleTextInput sample={sample} inline={true} disabled={isDisabled} onChange={onChange}
                           field="location"/>
        </td>
        <td>
          <SampleCASInput sample={sample} inline={true} disabled={isDisabled} onChange={onChange}
                          updateMoleculeCas={updateMoleculeCas} />
        </td>
        <td>
          {this.renderButtons()}
          {this.renderStructureEditorModal()}
        </td>
      </tr>
    )
  }
}

SampleInlineProperties.propTypes = {
  screen: PropTypes.object,
  onSave: PropTypes.func,
  showDetails: PropTypes.func
};
