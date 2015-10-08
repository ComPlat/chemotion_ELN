import React from 'react'
import {Panel, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';

import ElementStore from './stores/ElementStore';
import ElementActions from './actions/ElementActions';
import ReactionDetailsLiteratures from './ReactionDetailsLiteratures';
import MaterialGroupContainer from './MaterialGroupContainer';
import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import Aviator from 'aviator';
import SVG from 'react-inlinesvg';

import Reaction from './models/Reaction';
import Sample from './models/Sample';

export default class ReactionDetails extends React.Component {
  constructor(props) {
    super(props);
    const {reaction} = props;
    const {products, starting_materials, reactants} = props.reaction;

    this.state = {
      reaction,
      products,
      starting_materials,
      reactants
    };
  }

  componentDidMount() {
    let id = this.state.reaction.id;
    if(id != '_new_') {
      ElementActions.fetchReactionSvgByReactionId(id);
    }
  }

  componentWillReceiveProps(nextProps) {
    const nextReaction = nextProps.reaction;
    const currentReaction = this.props.reaction;

    if (nextReaction.id != currentReaction.id) {
      if(!nextReaction.isNew){
        ElementActions.fetchReactionSvgByReactionId(nextReaction.id);
      }
      this.setState({
        reaction: nextReaction
      });
    }
  }

  handleMaterialsChange(changeEvent) {
    switch (changeEvent.type) {
      case 'referenceChanged':
        this.setState({
          reaction: this.updatedReactionForReferenceChange(changeEvent)
        });
        break;
      case 'amountChanged':
        this.setState({
          reaction: this.updatedReactionForAmountChange(changeEvent)
        });
        break;
      case 'equivalentChanged':
        this.setState({
          reaction: this.updatedReactionForEquivalentChange(changeEvent)
        });
        break;
    }
  }

  updatedReactionForReferenceChange(changeEvent) {
    let {sampleID} = changeEvent;
    let sample = this.state.reaction.sampleById(sampleID);
    this.state.reaction.markSampleAsReference(sampleID);

    return this.updatedReactionWithSample(this.updatedSamplesForReferenceChange.bind(this), sample)
  }

  updatedReactionForAmountChange(changeEvent) {
    let {sampleID, amount} = changeEvent;
    let updatedSample = this.state.reaction.sampleById(sampleID);

    // normalize to milligram
    updatedSample.setAmountAndNormalizeToMilligram(amount.value, amount.unit);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample)
  }

  updatedReactionForEquivalentChange(changeEvent) {
    let {sampleID, equivalent} = changeEvent;
    let updatedSample = this.state.reaction.sampleById(sampleID);

    updatedSample.equivalent = equivalent;

    return this.updatedReactionWithSample(this.updatedSamplesForEquivalentChange.bind(this), updatedSample)
  }

  updatedReactionWithSample(updateFunction, updatedSample) {
    let {reaction} = this.state;
    reaction.starting_materials = updateFunction(reaction.starting_materials, updatedSample);
    reaction.reactants = updateFunction(reaction.reactants, updatedSample);
    reaction.products = updateFunction(reaction.products, updatedSample);
    return reaction;
  }

  updatedSamplesForAmountChange(samples, updatedSample) {
    let referenceMaterial = this.state.reaction.referenceMaterial;

    return samples.map((sample) => {
      if (sample.id == updatedSample.id) {

        sample.setAmountAndNormalizeToMilligram(updatedSample.amount_value, updatedSample.amount_unit);


        if(referenceMaterial) {
          if(!updatedSample.reference && referenceMaterial.amount_value) {
            sample.equivalent = sample.amount_mmol / referenceMaterial.amount_mmol;
          } else {
            sample.equivalent = 1.0;
          }
        }
      }
      else {

        if(updatedSample.reference) {
          if(sample.equivalent) {
            sample.setAmountAndNormalizeToMilligram(sample.equivalent * updatedSample.amount_mmol, 'mmol');
          }
        }
      }
      return sample;
    });
  }

  updatedSamplesForEquivalentChange(samples, updatedSample) {
    let referenceMaterial = this.state.reaction.referenceMaterial;

    return samples.map((sample) => {
      if (sample.id == updatedSample.id) {
        sample.equivalent = updatedSample.equivalent;
        if(referenceMaterial && referenceMaterial.amount_value) {
          sample.setAmountAndNormalizeToMilligram(updatedSample.equivalent * referenceMaterial.amount_mmol, 'mmol');
        }
        else if(sample.amount_value) {
          sample.setAmountAndNormalizeToMilligram(updatedSample.equivalent * sample.amount_mmol, 'mmol');
        }
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
          let referenceAmount = referenceMaterial.amount_mmol;
          if(referenceMaterial && referenceAmount) {
            sample.equivalent = sample.amount_mmol / referenceAmount;
          }
        }
        sample.reference = false;
      }
      return sample;
    });
  }

  // --

  dropSample(sample, materialGroup) {
    const {reaction} = this.props;
    const materials = reaction[materialGroup];

    let splitSample = Sample.buildChild(sample);
    console.log("splitSample:")
    console.dir(splitSample);

    materials.push(splitSample);
    this.setState({reaction});
    this.updateReactionSvg();
  }

  deleteMaterial(material, materialGroup) {
    const {reaction} = this.props;
    const materials = reaction[materialGroup];
    const materialIndex = materials.indexOf(material);
    materials.splice(materialIndex, 1);
    this.setState({reaction});
    this.updateReactionSvg();
  }

  dropMaterial(material, previousMaterialGroup, materialGroup) {
    const {reaction} = this.props;
    const materials = reaction[materialGroup];
    this.deleteMaterial(material, previousMaterialGroup);
    materials.push(material);
    this.setState({reaction});
    this.updateReactionSvg();
  }

  closeDetails() {
    UIActions.deselectAllElements();

    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  updateReactionSvg() {
    const {reaction} = this.props;
    const materialsInchikeys = {
      starting_materials: reaction.starting_materials.map(material => material.molecule.inchikey),
      reactants: reaction.reactants.map(material => material.molecule.inchikey),
      products: reaction.products.map(material => material.molecule.inchikey)
    };
    ElementActions.fetchReactionSvgByMaterialsInchikeys(materialsInchikeys);
  }

  render() {
    const {reaction} = this.props;
    const svgPath = (reaction.reactionSvg) ? "/images/reactions/" + reaction.reactionSvg : "";
    const svgContainerStyle = {
      position: 'relative',
      //height: 0,
      //width: '100%',
      padding: 0,
      paddingBottom: '30%'
    };

    return (
      <div>
        <Panel header="Reaction Details" bsStyle='primary'>
          <table width="100%" height="100px">
            <tr>
              <td width="30%">
                <h3>{reaction.name}</h3>
                <ElementCollectionLabels element={reaction} key={reaction.id}/>
              </td>
              <td width="70%">
                <div style={svgContainerStyle}>
                  <SVG key={reaction.reactionSvg} src={svgPath} className="molecule-small"/>
                </div>
              </td>
            </tr>
          </table>
          <Button href={"api/v1/reports/rtf?id=" + reaction.id}>
            Generate Report
          </Button>
          <ListGroup fill>
            <ListGroupItem header="Starting Materials">
              <MaterialGroupContainer
                materialGroup="starting_materials"
                materials={reaction.starting_materials}
                dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
                deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
                dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
                onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
                />
            </ListGroupItem>
            <ListGroupItem header="Reactants">
              <MaterialGroupContainer
                materialGroup="reactants"
                materials={reaction.reactants}
                dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
                deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
                dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
                onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
                />
            </ListGroupItem>
            <ListGroupItem header="Products">
              <MaterialGroupContainer
                materialGroup="products"
                materials={reaction.products}
                dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
                deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
                dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
                onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
                />
            </ListGroupItem>
            <ListGroupItem header='Literatures'>
              <ReactionDetailsLiteratures
                reaction_id={reaction.id}
                literatures={reaction.literatures}
                />
            </ListGroupItem>
          </ListGroup>
          <ButtonToolbar>
            <Button bsStyle="primary" onClick={() => this.closeDetails()}>Close</Button>
            <Button bsStyle="warning" onClick={() => this._submitFunction()}
                    disabled={!this.reactionIsValid()}>{this._submitLabel()}</Button>
          </ButtonToolbar>
        </Panel>
      </div>
    );
  }

  _submitFunction() {
    if(this.state.reaction && this.state.reaction.isNew) {
     ElementActions.createReaction(this.state.reaction);
    } else {
     ElementActions.updateReaction(this.state.reaction);
    }
  }

  _submitLabel() {
    if (this.state.reaction && this.state.reaction.isNew) {
      return "Create";
    } else {
      return "Save";
    }
  }

  reactionIsValid() {
    return true
  }

}
