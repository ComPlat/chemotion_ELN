import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  ListGroup, ListGroupItem, FormGroup, ControlLabel, FormControl,
  Row, Col, Collapse, Button, ButtonGroup
} from 'react-bootstrap';
import Select from 'react-select';
import Delta from 'quill-delta';
import MaterialGroupContainer from './MaterialGroupContainer';
import Sample from './models/Sample';
import Reaction from './models/Reaction';
import Molecule from './models/Molecule';
import ReactionDetailsMainProperties from './ReactionDetailsMainProperties';
import ReactionDetailsPurification from './ReactionDetailsPurification';
import QuillEditor from './QuillEditor';
import NotificationActions from './actions/NotificationActions';
import { reactionToolbarSymbol } from './utils/quillToolbarSymbol';
import GeneralProcedureDnd from './GeneralProcedureDnD';
import { rolesOptions, conditionsOptions } from './staticDropdownOptions/options';
import OlsTreeSelect from './OlsComponent';
import ReactionDetailsDuration from './ReactionDetailsDuration';

export default class ReactionDetailsScheme extends Component {
  constructor(props) {
    super(props);
    const { reaction } = props;
    this.state = { reaction, lockEquivColumn: false, cCon: false };
    this.quillref = React.createRef();
    this.additionQuillRef = React.createRef();
    this.onChangeRole = this.onChangeRole.bind(this);
    this.renderRole = this.renderRole.bind(this);
    this.addSampleTo = this.addSampleTo.bind(this);
    this.dropMaterial = this.dropMaterial.bind(this);
    this.dropSample = this.dropSample.bind(this);
    this.switchEquiv = this.switchEquiv.bind(this);
    this.handleOnConditionSelect = this.handleOnConditionSelect.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    const {reaction} = this.state;
    const nextReaction = nextProps.reaction;
    this.setState({ reaction: nextReaction });
  }

  dropSample(srcSample, tagMaterial, tagGroup, extLabel, isNewSample = false) {
    const { reaction } = this.state;
    let splitSample;

    if (srcSample instanceof Molecule || isNewSample) {
      // Create new Sample with counter
      splitSample = Sample.buildNew(srcSample, reaction.collection_id, tagGroup);
    } else if (srcSample instanceof Sample) {
      if (tagGroup === 'reactants' || tagGroup === 'solvents') {
        // Skip counter for reactants or solvents
        splitSample = srcSample.buildChildWithoutCounter();
        splitSample.short_label = tagGroup.slice(0, -1);
      } else {
        splitSample = srcSample.buildChild();
      }
    }

    if (tagGroup == 'solvents') {
      splitSample.reference = false;
    }

    this.insertSolventExtLabel(splitSample, tagGroup, extLabel);
    reaction.addMaterialAt(splitSample, null, tagMaterial, tagGroup);
    this.onReactionChange(reaction, { schemaChanged: true });
  }

  insertSolventExtLabel(splitSample, materialGroup, external_label) {
    if(external_label && materialGroup === 'solvents' && !splitSample.external_label) {
      splitSample.external_label = external_label;
    }
  }

  onChangeRole(e) {
    const { onInputChange } = this.props;
    const value = e && e.value;
    onInputChange('role', value);
  }

  switchEquiv() {
    const { lockEquivColumn } = this.state;
    this.setState({ lockEquivColumn: !lockEquivColumn });
  }

  handleOnConditionSelect(eventKey) {
    const { reaction } = this.props;
    const val = eventKey.value;
    if (reaction.conditions == null || reaction.conditions.length === 0) {
      reaction.conditions = `${val} `;
    } else {
      reaction.conditions += `\n${val} `;
    }
    this.props.onReactionChange(reaction, { schemaChanged: true });
  }

  renderGPDnD() {
    const { reaction } = this.props;
    return (
      <GeneralProcedureDnd
        reaction={reaction}
      />
    );
  }

  renderRolesOptions(opt) {
    const className = `fa ${opt.icon} ${opt.bsStyle}`;
    return (
      <span>
        <i className={className} />
        <span className="spacer-10" />
        {opt.label}
      </span>
    );
  }

  renderRoleSelect() {
    const { role } = this.props.reaction;
    return (
      <Select
        name="role"
        options={rolesOptions}
        optionRenderer={this.renderRolesOptions}
        multi={false}
        clearable
        value={role}
        onChange={this.onChangeRole}
      />
    );
  }

  renderRole() {
    const { role } = this.props.reaction;
    const accordTo = role === 'parts' ? 'According to' : null;
    return (
      <span>
        <Col md={3} style={{ paddingLeft: '6px' }}>
          <FormGroup>
            <ControlLabel>Role</ControlLabel>
            {this.renderRoleSelect()}
          </FormGroup>
        </Col>
        <Col md={3} style={{ paddingLeft: '6px' }}>
          <FormGroup>
            <ControlLabel>{accordTo}</ControlLabel>
            {this.renderGPDnD()}
          </FormGroup>
        </Col>
      </span>
    );
  }

  deleteMaterial(material, materialGroup) {
    const { reaction } = this.state;
    reaction.deleteMaterial(material, materialGroup);

    // only reference of 'starting_materials' or 'reactants' triggers updatedReactionForReferenceChange
    // only when reaction.referenceMaterial not exist triggers updatedReactionForReferenceChange
    const referenceRelatedGroup = ['starting_materials', 'reactants'];
    if (referenceRelatedGroup.includes(materialGroup) && (!reaction.referenceMaterial)) {
      if (reaction[materialGroup].length === 0) {
        const refMaterialGroup = materialGroup === 'starting_materials' ? 'reactants' : 'starting_materials';
        if (reaction[refMaterialGroup].length > 0) {
          const event = {
            type: 'referenceChanged',
            refMaterialGroup,
            sampleID: reaction[refMaterialGroup][0].id,
            value: 'on'
          };
          this.updatedReactionForReferenceChange(event);
        }
      } else {
        const event = {
          type: 'referenceChanged',
          materialGroup,
          sampleID: reaction[materialGroup][0].id,
          value: 'on'
        };
        this.updatedReactionForReferenceChange(event);
      }
    }

    this.onReactionChange(reaction, { schemaChanged: true });
  }

  dropMaterial(srcMat, srcGroup, tagMat, tagGroup) {
    const { reaction } = this.state;
    reaction.moveMaterial(srcMat, srcGroup, tagMat, tagGroup);
    this.onReactionChange(reaction, { schemaChanged: true });
  }

  onReactionChange(reaction, options = {}) {
    this.props.onReactionChange(reaction, options);
  }

  handleMaterialsChange(changeEvent) {
    switch (changeEvent.type) {
      case 'referenceChanged':
        this.onReactionChange(
          this.updatedReactionForReferenceChange(changeEvent)
        );
        break;
      case 'amountChanged':
        this.onReactionChange(
          this.updatedReactionForAmountChange(changeEvent)
        );
        break;
      case 'amountUnitChanged':
        this.onReactionChange(
          this.updatedReactionForAmountUnitChange(changeEvent)
        );
        break;
      case 'MetricsChanged':
        this.onReactionChange(
          this.updatedReactionForMetricsChange(changeEvent)
        );
        break;
      case 'loadingChanged':
        this.onReactionChange(
          this.updatedReactionForLoadingChange(changeEvent)
        );
        break;
      case 'amountTypeChanged':
        this.onReactionChange(
          this.updatedReactionForAmountTypeChange(changeEvent)
        );
        break;
      case 'equivalentChanged':
        this.onReactionChange(
          this.updatedReactionForEquivalentChange(changeEvent)
        );
        break;
      case 'externalLabelChanged':
        this.onReactionChange(
          this.updatedReactionForExternalLabelChange(changeEvent)
        );
        break;
      case 'externalLabelCompleted':
        const {reaction} = this.state;
        this.onReactionChange(reaction, {schemaChanged: true});
        break;
      case 'addToDesc':
        this.addSampleTo(changeEvent,  'description');
        this.addSampleTo(changeEvent, 'observation');
        break;
    }
  }

  addSampleTo(e, type) {
    const { paragraph } = e;
    let quillEditor = this.quillref.current.editor;
    if (type === 'observation') quillEditor = this.additionQuillRef.current.editor;
    const range = quillEditor.getSelection();
    if (range) {
      let contents = quillEditor.getContents();
      let insertOps = [{ insert: paragraph }];
      const insertDelta = new Delta(insertOps);
      if (range.index > 0) {
        insertOps = [{ retain: range.index }].concat(insertOps);
      }
      const elementDelta = new Delta(insertOps);
      contents = contents.compose(elementDelta);
      quillEditor.setContents(contents);
      range.length = 0;
      range.index += insertDelta.length();
      quillEditor.setSelection(range);
      this.props.onInputChange(type, new Delta(contents));
    }
  }

  updatedReactionForExternalLabelChange(changeEvent) {
    const { sampleID, externalLabel } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.external_label = externalLabel;

    return this.updatedReactionWithSample(this.updatedSamplesForExternalLabelChange.bind(this), updatedSample);
  }

  updatedReactionForReferenceChange(changeEvent) {
    const { sampleID } = changeEvent;
    const { reaction } = this.state;
    const sample = reaction.sampleById(sampleID);

    reaction.markSampleAsReference(sampleID);

    return this.updatedReactionWithSample(this.updatedSamplesForReferenceChange.bind(this), sample);
  }

  updatedReactionForAmountChange(changeEvent) {
    const { sampleID, amount } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    // normalize to milligram
    updatedSample.setAmountAndNormalizeToGram(amount);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForAmountUnitChange(changeEvent) {
    const { sampleID, amount } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);
    // normalize to milligram
    // updatedSample.setAmountAndNormalizeToGram(amount);
    updatedSample.setAmount(amount);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForMetricsChange(changeEvent) {
    const { sampleID, metricUnit, metricPrefix } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);
    updatedSample.setUnitMetrics(metricUnit, metricPrefix);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForLoadingChange(changeEvent) {
    const { sampleID, amountType } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.amountType = amountType;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForAmountTypeChange(changeEvent) {
    const { sampleID, amountType } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.amountType = amountType;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample);
  }

  updatedReactionForEquivalentChange(changeEvent) {
    const { sampleID, equivalent } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.equivalent = equivalent;

    return this.updatedReactionWithSample(this.updatedSamplesForEquivalentChange.bind(this), updatedSample);
  }

  calculateEquivalent(refM, updatedSample) {
    if(!refM.contains_residues) {
      NotificationActions.add({
        message: 'Cannot perform calculations for loading and equivalent',
        level: 'error'
      });

      return 1.0;
    }

    if(!refM.loading){
      NotificationActions.add({
        message: 'Please set non-zero starting material loading',
        level: 'error'
      });

      return 0.0;
    }

    let loading = refM.residues[0].custom_info.loading;
    let mass_koef = updatedSample.amount_g / refM.amount_g;
    let mwb = updatedSample.molecule.molecular_weight;
    let mwa = refM.molecule.molecular_weight;
    let mw_diff = mwb - mwa;
    let equivalent = (1000.0 / loading) * (mass_koef - 1.0) / mw_diff;

    if(equivalent < 0.0 || equivalent > 1.0 || isNaN(equivalent) || !isFinite(equivalent)){
      equivalent = 1.0;
    }

    return equivalent;
  }

  checkMassMolecule(referenceM, updatedS) {
    let errorMsg;
    let mFull;
    const mwb = updatedS.molecule.molecular_weight;

    // mass check apply to 'polymers' only
    if (!updatedS.contains_residues) {
      mFull = referenceM.amount_mol * mwb;
      if (updatedS.amount_g > mFull) {
        errorMsg = 'Experimental mass value is more than possible\n' +
        'by 100% conversion! Please check your data.';
      }
    } else {
      const mwa = referenceM.molecule.molecular_weight;
      const deltaM = mwb - mwa;
      const massA = referenceM.amount_g;
      mFull = massA + (referenceM.amount_mol * deltaM);
      const massExperimental = updatedS.amount_g;

      if (deltaM > 0) { // expect weight gain
        if (massExperimental > mFull) {
          errorMsg = 'Experimental mass value is more than possible\n' +
            'by 100% conversion! Please check your data.';
        } else if (massExperimental < massA) {
          errorMsg = 'Material loss! ' +
            'Experimental mass value is less than possible!\n' +
            'Please check your data.';
        }
      } else if (massExperimental < mFull) { // expect weight loss
        errorMsg = 'Experimental mass value is less than possible\n' +
          'by 100% conversion! Please check your data.';
      }
    }

    updatedS.maxAmount = mFull;

    if (errorMsg) {
      updatedS.error_mass = true;
      NotificationActions.add({
        message: errorMsg,
        level: 'error',
      });
    } else {
      updatedS.error_mass = false;
    }

    return { mFull, errorMsg };
  }

  checkMassPolymer(referenceM, updatedS, massAnalyses) {
    const equivalent = this.calculateEquivalent(referenceM, updatedS);
    updatedS.equivalent = equivalent;
    let fconv_loading = referenceM.amount_mol / updatedS.amount_g * 1000.0;
    updatedS.residues[0].custom_info['loading_full_conv'] = fconv_loading;
    updatedS.residues[0].custom_info['loading_type'] = 'mass_diff';

    let newAmountMol;

    if (equivalent < 0.0 || equivalent > 1.0) {
      updatedS.adjusted_equivalent = equivalent > 1.0 ? 1.0 : 0.0;
      updatedS.adjusted_amount_mol = referenceM.amount_mol
      updatedS.adjusted_loading = fconv_loading;
      updatedS.adjusted_amount_g = updatedS.amount_g;
      newAmountMol = referenceM.amount_mol;
    }

    newAmountMol = referenceM.amount_mol * equivalent;
    const newLoading = (newAmountMol / updatedS.amount_g) * 1000.0;

    updatedS.residues[0].custom_info.loading = newLoading;
  }

  updatedSamplesForAmountChange(samples, updatedSample, materialGroup) {
    const { referenceMaterial } = this.props.reaction;
    const { lockEquivColumn } = this.state;
    return samples.map((sample) => {
      if (referenceMaterial) {
        if (sample.id === updatedSample.id) {
          if (!updatedSample.reference && referenceMaterial.amount_value) {
            if (materialGroup === 'products') {
              const massAnalyses = this.checkMassMolecule(referenceMaterial, updatedSample);
              if (updatedSample.contains_residues) {
                this.checkMassPolymer(referenceMaterial, updatedSample, massAnalyses);
                return sample;
              }
              sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol;
            } else {
              if (!lockEquivColumn) {
                sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol;
              } else {
                if (referenceMaterial && referenceMaterial.amount_value) {
                  sample.setAmountAndNormalizeToGram({
                    value: sample.equivalent * referenceMaterial.amount_mol,
                    unit: 'mol',
                  });
                } else if (sample.amount_value) {
                  sample.setAmountAndNormalizeToGram({
                    value: sample.equivalent * sample.amount_mol,
                    unit: 'mol'
                  });
                }

              }
            }
          } else {
            if (materialGroup === 'products') {
              sample.equivalent = 0.0;
            } else {
              sample.equivalent = 1.0;
            }
          }
        } else {
          if (!lockEquivColumn || materialGroup === 'products') {
            // calculate equivalent, don't touch real amount
            sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol;
          } else {
            //sample.amount_mol = sample.equivalent * referenceMaterial.amount_mol;
            if (referenceMaterial && referenceMaterial.amount_value) {
              sample.setAmountAndNormalizeToGram({
                value: sample.equivalent * referenceMaterial.amount_mol,
                unit: 'mol',
              });
            }
          }
        }

        if (materialGroup === 'products' && (sample.equivalent < 0.0 || sample.equivalent > 1.0 || isNaN(sample.equivalent) || !isFinite(sample.equivalent))) {
          sample.equivalent = 1.0;
        }
        if (materialGroup === 'products' && (sample.amount_mol === 0 || referenceMaterial.amount_mol === 0)) {
          sample.equivalent = 0.0;
        }
      }

      if (materialGroup === 'products') {
        if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
          sample.maxAmount = referenceMaterial.amount_mol * sample.molecule_molecular_weight;
        }
      }

      if (materialGroup === 'products') {
        if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
          sample.maxAmount = referenceMaterial.amount_mol * sample.molecule_molecular_weight;
        }
      }
      return sample;
    });
  }

  updatedSamplesForEquivalentChange(samples, updatedSample) {
    const { referenceMaterial } = this.props.reaction;
    return samples.map((sample) => {
      if (sample.id === updatedSample.id && updatedSample.equivalent) {
        sample.equivalent = updatedSample.equivalent;
        if (referenceMaterial && referenceMaterial.amount_value) {
          sample.setAmountAndNormalizeToGram({
            value: updatedSample.equivalent * referenceMaterial.amount_mol,
            unit: 'mol',
          });
        } else if (sample.amount_value) {
          sample.setAmountAndNormalizeToGram({
            value: updatedSample.equivalent * sample.amount_mol,
            unit: 'mol'
          });
        }
      }
      if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
        sample.maxAmount = referenceMaterial.amount_mol * sample.molecule_molecular_weight;
      }
      return sample;
    });
  }

  updatedSamplesForExternalLabelChange(samples, updatedSample) {
    const { referenceMaterial } = this.props.reaction;
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        sample.external_label = updatedSample.external_label;
      }
      return sample;
    });
  }

  updatedSamplesForReferenceChange(samples, referenceMaterial) {
    return samples.map((sample) => {
      if (sample.id === referenceMaterial.id) {
        sample.equivalent = 1.0;
        sample.reference = true;
      } else {
        if (sample.amount_value) {
          const referenceAmount = referenceMaterial.amount_mol;
          if (referenceMaterial && referenceAmount) {
            sample.equivalent = sample.amount_mol / referenceAmount;
          }
        }
        sample.reference = false;
      }
      return sample;
    });
  }

  updatedReactionWithSample(updateFunction, updatedSample) {
    const { reaction } = this.state;
    reaction.starting_materials = updateFunction(reaction.starting_materials, updatedSample, 'starting_materials');
    reaction.reactants = updateFunction(reaction.reactants, updatedSample, 'reactants');
    reaction.solvents = updateFunction(reaction.solvents, updatedSample, 'solvents');
    reaction.products = updateFunction(reaction.products, updatedSample, 'products');
    return reaction;
  }

  solventCollapseBtn() {
    const { open } = this.state;
    const arrow = open
      ? <i className="fa fa-angle-double-up" />
      : <i className="fa fa-angle-double-down" />;
    return (
      <ButtonGroup vertical block>
        <Button
          bsSize="xsmall"
          style={{ backgroundColor: '#ddd' }}
          onClick={() => this.setState({ open: !open })}
        >{arrow} &nbsp; Solvents
        </Button>
      </ButtonGroup>
    );
  }

  conditionsCollapseBtn() {
    const { cCon } = this.state;
    const arrow = cCon
      ? <i className="fa fa-angle-double-up" />
      : <i className="fa fa-angle-double-down" />;
    return (
      <ButtonGroup vertical block>
        <Button
          bsSize="xsmall"
          style={{ backgroundColor: '#ddd' }}
          onClick={() => this.setState({ cCon: !cCon })}
        >{arrow} &nbsp; Conditions
        </Button>
      </ButtonGroup>
    );
  }

  render() {
    const { reaction, lockEquivColumn } = this.state;
    const minPadding = { padding: '1px 2px 2px 0px' };
    if (reaction.editedSample !== undefined) {
      if (reaction.editedSample.amountType === 'target') {
        this.updatedSamplesForEquivalentChange(reaction.samples, reaction.editedSample);
      } else { // real amount, so that we update amount in mmol
        this.updatedSamplesForAmountChange(reaction.samples, reaction.editedSample);
      }
      reaction.editedSample = undefined;
    } else {
      const { referenceMaterial } = this.props.reaction;
      reaction.products.map((sample) => {
        sample.concn = sample.amount_mol / reaction.solventVolume;
        if (typeof (referenceMaterial) !== 'undefined' && referenceMaterial) {
          if (sample.contains_residues) {
            sample.maxAmount = referenceMaterial.amount_g + (referenceMaterial.amount_mol
              * (sample.molecule.molecular_weight - referenceMaterial.molecule.molecular_weight));
          } else {
            sample.maxAmount = referenceMaterial.amount_mol * sample.molecule_molecular_weight;
          }
        }
      });
    }

    if ((typeof (lockEquivColumn) !== 'undefined' && !lockEquivColumn) || !reaction.changed) {
      reaction.starting_materials.map((sample) => {
        sample.concn = sample.amount_mol / reaction.solventVolume;
      });
      reaction.reactants.map((sample) => {
        sample.concn = sample.amount_mol / reaction.solventVolume;
      });
    }

    // if no reference material then mark first starting material
    const refM = this.props.reaction.starting_materials[0];
    if (!this.props.reaction.referenceMaterial && refM) {
      reaction.markSampleAsReference(refM.id);
    }

    const headReactants = reaction.starting_materials.length;

    return (
      <div>
        <ListGroup fill="true">
          <ListGroupItem style={minPadding}>
            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="starting_materials"
              materials={reaction.starting_materials}
              dropMaterial={this.dropMaterial}
              deleteMaterial={
                (material, materialGroup) => this.deleteMaterial(material, materialGroup)
              }
              dropSample={this.dropSample}
              showLoadingColumn={!!reaction.hasPolymers()}
              onChange={changeEvent => this.handleMaterialsChange(changeEvent)}
              switchEquiv={this.switchEquiv}
              lockEquivColumn={this.state.lockEquivColumn}
              headIndex={0}
            />
          </ListGroupItem>
          <ListGroupItem style={minPadding} >
            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="reactants"
              materials={reaction.reactants}
              dropMaterial={this.dropMaterial}
              deleteMaterial={
                (material, materialGroup) => this.deleteMaterial(material, materialGroup)
              }
              dropSample={this.dropSample}
              showLoadingColumn={!!reaction.hasPolymers()}
              onChange={changeEvent => this.handleMaterialsChange(changeEvent)}
              switchEquiv={this.switchEquiv}
              lockEquivColumn={lockEquivColumn}
              headIndex={headReactants}
            />
          </ListGroupItem>
          <ListGroupItem style={minPadding}>

            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="products"
              materials={reaction.products}
              dropMaterial={this.dropMaterial}
              deleteMaterial={
                (material, materialGroup) => this.deleteMaterial(material, materialGroup)
              }
              dropSample={this.dropSample}
              showLoadingColumn={!!reaction.hasPolymers()}
              onChange={changeEvent => this.handleMaterialsChange(changeEvent)}
              switchEquiv={this.switchEquiv}
              lockEquivColumn={this.state.lockEquivColumn}
              headIndex={0}
            />
          </ListGroupItem>
          <ListGroupItem style={minPadding}>
            { this.solventCollapseBtn() }
            <Collapse in={this.state.open}>
              <div>
                <MaterialGroupContainer
                  reaction={reaction}
                  materialGroup="solvents"
                  materials={reaction.solvents}
                  dropMaterial={this.dropMaterial}
                  deleteMaterial={
                    (material, materialGroup) => this.deleteMaterial(material, materialGroup)
                  }
                  dropSample={this.dropSample}
                  showLoadingColumn={!!reaction.hasPolymers()}
                  onChange={changeEvent => this.handleMaterialsChange(changeEvent)}
                  switchEquiv={this.switchEquiv}
                  lockEquivColumn={this.state.lockEquivColumn}
                  headIndex={0}
                />
              </div>
            </Collapse>
          </ListGroupItem>
          <ListGroupItem style={minPadding}>
            { this.conditionsCollapseBtn() }
            <Collapse in={this.state.cCon}>
              <div>
                <Select
                  name="default_conditions"
                  multi={false}
                  options={conditionsOptions}
                  onChange={this.handleOnConditionSelect}
                />
                <FormControl
                  componentClass="textarea"
                  rows="4"
                  value={reaction.conditions || ''}
                  disabled={reaction.isMethodDisabled('conditions')}
                  placeholder="Conditions..."
                  onChange={event => this.props.onInputChange('conditions', event)}
                />
              </div>
            </Collapse>
          </ListGroupItem>
        </ListGroup>
        <ListGroup>
          <ListGroupItem>
            <div className="reaction-scheme-props">
              <ReactionDetailsMainProperties
                reaction={reaction}
                onInputChange={(type, event) => this.props.onInputChange(type, event)}
              />
            </div>
            <ReactionDetailsDuration
              reaction={reaction}
              onInputChange={(type, event) => this.props.onInputChange(type, event)}
            />
            <Row>
              <Col md={6}>
                <FormGroup>
                  <ControlLabel>Type (Name Reaction Ontology)</ControlLabel>
                  <OlsTreeSelect
                    selectName="rxno"
                    selectedValue={(reaction.rxno && reaction.rxno.trim()) || ''}
                    onSelectChange={event => this.props.onInputChange('rxno', event.trim())}
                    selectedDisable={reaction.isMethodDisabled('rxno')}
                  />
                </FormGroup>
              </Col>
              {this.renderRole()}
            </Row>
            <Row>
              <Col md={12}>
                <FormGroup>
                  <ControlLabel>Description</ControlLabel>
                  <div className="quill-resize">
                    <QuillEditor
                      height="100%"
                      ref={this.quillref}
                      value={reaction.description}
                      onChange={event => this.props.onInputChange('description', event)}
                      toolbarSymbol={reactionToolbarSymbol}
                    />
                  </div>
                </FormGroup>
              </Col>
            </Row>
            <ReactionDetailsPurification
              reaction={reaction}
              onReactionChange={r => this.onReactionChange(r)}
              onInputChange={(type, event) => this.props.onInputChange(type, event)}
              additionQuillRef={this.additionQuillRef}
            />
          </ListGroupItem>
        </ListGroup>
      </div>
    );
  }
}

ReactionDetailsScheme.propTypes = {
  reaction: PropTypes.instanceOf(Reaction).isRequired,
  onReactionChange: PropTypes.func.isRequired,
  onInputChange: PropTypes.func.isRequired
};
