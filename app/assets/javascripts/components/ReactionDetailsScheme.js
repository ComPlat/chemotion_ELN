import React, {Component} from 'react';
import { ListGroup, ListGroupItem,Tooltip, OverlayTrigger,
         Tabs, Tab, Row, Col, Collapse, Button, ButtonGroup } from 'react-bootstrap';
import MaterialGroupContainer from './MaterialGroupContainer';
import Sample from './models/Sample';
import Molecule from './models/Molecule';
import ReactionDetailsMainProperties from './ReactionDetailsMainProperties';

import NotificationActions from './actions/NotificationActions'

export default class ReactionDetailsScheme extends Component {
  constructor(props) {
    super(props);
    let {reaction} = props;
    this.state = { reaction };
  }

  componentWillReceiveProps(nextProps) {
    const {reaction} = this.state;
    const nextReaction = nextProps.reaction;
    this.setState({ reaction: nextReaction });
  }

  dropSample(sample, materialGroup, external_label) {
    let {reaction} = this.state;
    let splitSample ;

    if (sample instanceof Molecule || materialGroup == 'products'){
      // Create new Sample with counter
      splitSample = Sample.buildNew(sample, reaction.collection_id);
    } else if (sample instanceof Sample) {
      // Else split Sample
      if(reaction.hasSample(sample.id)) {
        NotificationActions.add({
          message: 'The sample is already present in current reaction.',
          level: 'error'
        });
        return false;
      }

      if (materialGroup == 'reactants' || materialGroup == 'solvents') {
        // Skip counter for reactants or solvents
        splitSample = sample.buildChildWithoutCounter();
      } else {
        splitSample = sample.buildChild();
      }
    }
  
    this.insertSolventExtLabel(splitSample, materialGroup, external_label);

    reaction.addMaterial(splitSample, materialGroup);

    this.onReactionChange(reaction, {schemaChanged: true});
  }

  insertSolventExtLabel(splitSample, materialGroup, external_label) {
    if(external_label && materialGroup === 'solvents' && !splitSample.external_label) {
      splitSample.external_label = external_label;
    }
  }

  deleteMaterial(material, materialGroup) {
    let {reaction} = this.state;
    reaction.deleteMaterial(material, materialGroup);
    this.onReactionChange(reaction, {schemaChanged: true});
  }

  dropMaterial(material, previousMaterialGroup, materialGroup) {
    const {reaction} = this.state;
    reaction.moveMaterial(material, previousMaterialGroup, materialGroup);
    this.onReactionChange(reaction, {schemaChanged: true});
  }

  onReactionChange(reaction, options={}) {
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
    }
  }

  updatedReactionForExternalLabelChange(changeEvent) {
    let {sampleID, externalLabel} = changeEvent;
    let updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.external_label = externalLabel;

    return this.updatedReactionWithSample(this.updatedSamplesForExternalLabelChange.bind(this), updatedSample)
  }

  updatedReactionForReferenceChange(changeEvent) {
    const {sampleID} = changeEvent;
    const {reaction} = this.state;
    const sample = reaction.sampleById(sampleID);

    reaction.markSampleAsReference(sampleID);

    return this.updatedReactionWithSample(this.updatedSamplesForReferenceChange.bind(this), sample)
  }

  updatedReactionForAmountChange(changeEvent) {
    const { sampleID, amount } = changeEvent;
    const updatedSample = this.props.reaction.sampleById(sampleID);

    // normalize to milligram
    // updatedSample.setAmountAndNormalizeToGram(amount);
    updatedSample.setAmount(amount);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample)
  }

  updatedReactionForAmountUnitChange(changeEvent) {
    let {sampleID, amount} = changeEvent;
    let updatedSample = this.props.reaction.sampleById(sampleID);

    // normalize to milligram
    updatedSample.setAmountAndUnit(amount);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample)
  }

  updatedReactionForLoadingChange(changeEvent) {
    let {sampleID, amountType} = changeEvent;
    let updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.amountType = amountType;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample)
  }

  updatedReactionForAmountTypeChange(changeEvent) {
    let {sampleID, amountType} = changeEvent;
    let updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.amountType = amountType;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample)
  }

  updatedReactionForEquivalentChange(changeEvent) {
    let {sampleID, equivalent} = changeEvent;
    let updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.equivalent = equivalent;

    return this.updatedReactionWithSample(this.updatedSamplesForEquivalentChange.bind(this), updatedSample)
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
    let mwb = updatedS.molecule.molecular_weight;

    // mass check apply to 'polymers' only
    if(!updatedS.contains_residues) {
      mFull = referenceM.amount_mol * mwb;
    } else {
      let mwa = referenceM.molecule.molecular_weight;
      let deltaM = mwb - mwa;
      let massA = referenceM.amount_g;
      mFull = massA + referenceM.amount_mol * deltaM;

      let massExperimental = updatedS.amount_g;
      if(deltaM > 0) { //expect weight gain
        if(massExperimental > mFull) {
          errorMsg = 'Experimental mass value is more than possible \
                      by 100% conversion! Please check your data.';
        } else if(massExperimental < massA) {
          errorMsg = 'Material loss! \
                    Experimental mass value is less than possible! \
                    Please check your data.';
        }
      } else { //expect weight loss
        if(massExperimental < mFull) {
          errorMsg = 'Experimental mass value is less than possible \
                      by 100% conversion! Please check your data.';
        }
      }
    }

    if(errorMsg) {
      updatedS.error_mass = true;
      NotificationActions.add({
        message: errorMsg,
        level: 'error'
      });
    } else {
      updatedS.error_mass = false;
    }

    return {
      mFull: mFull,
      errorMsg: errorMsg
    }
  }

  checkMassPolymer(referenceM, updatedS, massAnalyses) {
    let equivalent = this.calculateEquivalent(referenceM, updatedS);
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

    let newLoading;
    newAmountMol = referenceM.amount_mol * equivalent;
    newLoading = newAmountMol / updatedS.amount_g * 1000.0;

    updatedS.residues[0].custom_info.loading = newLoading;
  }

  updatedSamplesForAmountChange(samples, updatedSample, materialGroup) {
    const {referenceMaterial} = this.props.reaction;
    return samples.map((sample) => {
      if (sample.id == updatedSample.id) {
        if(referenceMaterial) {
          if(!updatedSample.reference && referenceMaterial.amount_value) {
            if(materialGroup == 'products') {
              let massAnalyses = this.checkMassMolecule(referenceMaterial, updatedSample);
              if(updatedSample.contains_residues) {
                this.checkMassPolymer(referenceMaterial, updatedSample, massAnalyses);
                return sample;
              }
            }
            sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol;
          } else {
            sample.equivalent = 1.0;
          }
        }
      } else {
        // calculate equivalent, don't touch real amount
        sample.equivalent = sample.amount_mol / referenceMaterial.amount_mol;
      }

      if(materialGroup == 'products' && (sample.equivalent < 0.0 || sample.equivalent > 1.0 || isNaN(sample.equivalent) || !isFinite(sample.equivalent))){
        sample.equivalent = 1.0;
      }

      return sample;
    });
  }

  updatedSamplesForEquivalentChange(samples, updatedSample) {
    const { referenceMaterial } = this.props.reaction;
    return samples.map((sample) => {
      if (sample.id === updatedSample.id) {
        sample.equivalent = updatedSample.equivalent;
        if (referenceMaterial && referenceMaterial.amount_value) {
          // sample.setAmountAndNormalizeToGram({
          sample.setAmount({
            value: updatedSample.equivalent * referenceMaterial.amount_mol,
            unit: 'mol',
          });
        } else if (sample.amount_value) {
          sample.setAmount({
            value: updatedSample.equivalent * sample.amount_mol,
            unit: 'mol'
          });
        }
      }

      return sample;
    });
  }

  updatedSamplesForExternalLabelChange(samples, updatedSample) {
    const {referenceMaterial} = this.props.reaction;
    return samples.map((sample) => {
      if (sample.id == updatedSample.id) {
        sample.external_label = updatedSample.external_label;
      }
      return sample;
    });
  }

  updatedSamplesForReferenceChange(samples, referenceMaterial) {
    return samples.map((sample) => {
      if (sample.id == referenceMaterial.id) {
        sample.equivalent = 1.0;
        sample.reference = true;
      }
      else {
        if(sample.amount_value) {
          let referenceAmount = referenceMaterial.amount_mol;
          if(referenceMaterial && referenceAmount) {
            sample.equivalent = sample.amount_mol / referenceAmount;
          }
        }
        sample.reference = false;
      }
      return sample;
    });
  }

  updatedReactionWithSample(updateFunction, updatedSample) {
    const {reaction} = this.state;
    reaction.starting_materials = updateFunction(reaction.starting_materials, updatedSample, 'starting_materials');
    reaction.reactants = updateFunction(reaction.reactants, updatedSample, 'reactants');
    reaction.solvents = updateFunction(reaction.solvents, updatedSample, 'solvents');
    reaction.products = updateFunction(reaction.products, updatedSample, 'products');
    return reaction;
  }

  solventCollapseBtn() {
    const open = this.state.open;
    const arrow = open
      ? <i className="fa fa-angle-double-up"/>
      : <i className="fa fa-angle-double-down"/>;
    return (
      <ButtonGroup vertical block>
        <Button bsSize="xsmall"
                style={{ backgroundColor: '#ddd' }}
                onClick={ () => this.setState({ open: !open }) }>
          { arrow } &nbsp; Solvents
        </Button>
      </ButtonGroup>
    );
  }

  render() {
    let { reaction } = this.state;
    let minPadding = {padding: "1px 2px 2px 0px"}
    if(reaction.editedSample != undefined) {
      if(reaction.editedSample.amountType == 'target') {
        this.updatedSamplesForEquivalentChange(reaction.samples, reaction.editedSample);
      } else { // real amount, so that we update amount in mmol
        this.updatedSamplesForAmountChange(reaction.samples, reaction.editedSample);
      }
      reaction.editedSample = undefined;
    }

    // if no reference material then mark first starting material
    let refM = this.props.reaction.starting_materials[0];
    if(!this.props.reaction.referenceMaterial && refM) {
      reaction.markSampleAsReference(refM.id);
    }

    return (
      <div>
        <ListGroup fill>
          <ListGroupItem style={minPadding}>

            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="starting_materials"
              materials={reaction.starting_materials}
              dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
              deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
              dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
              showLoadingColumn={reaction.hasPolymers()}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)} />
          </ListGroupItem>
          <ListGroupItem style={minPadding} >

            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="reactants"
              materials={reaction.reactants}
              dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
              deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
              dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
              showLoadingColumn={reaction.hasPolymers()}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)} />

          </ListGroupItem>
          <ListGroupItem style={minPadding}>

            <MaterialGroupContainer
              reaction={reaction}
              materialGroup="products"
              materials={reaction.products}
              dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
              deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
              dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
              showLoadingColumn={reaction.hasPolymers()}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)} />

          </ListGroupItem>
          <ListGroupItem style={minPadding}>
            { this.solventCollapseBtn() }
            <Collapse in={ this.state.open }>
              <div>
                <MaterialGroupContainer
                  reaction={reaction}
                  materialGroup="solvents"
                  materials={reaction.solvents}
                  dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
                  deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
                  dropSample={(sample, materialGroup, external_label) => this.dropSample(sample, materialGroup, external_label)}
                  showLoadingColumn={reaction.hasPolymers()}
                  onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)} />
              </div>
            </Collapse>
          </ListGroupItem>
        </ListGroup>

        <ReactionDetailsMainProperties
          reaction={reaction}
          onInputChange={(type, event) => this.props.onInputChange(type, event)} />
      </div>
    );
  }
}

ReactionDetailsScheme.propTypes = {
  reaction: React.PropTypes.object,
  onReactionChange: React.PropTypes.func,
  onInputChange: React.PropTypes.func
}
