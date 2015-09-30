import React from 'react'
import {Panel, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';

import ElementStore from './stores/ElementStore';
import ReactionDetailsLiteratures from './ReactionDetailsLiteratures';
import MaterialGroupContainer from './MaterialGroupContainer';
import UIStore from './stores/UIStore';
import Aviator from 'aviator';

export default class ReactionDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      reaction: props.reaction
    };
    console.log(this.state.reaction);
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    if (! state.currentElement || state.currentElement.type == 'reaction') {
      this.setState({
        reaction: state.currentElement
      });
    }
  }

  // ---

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
    let {reaction} = this.state;
    let {sampleID} = changeEvent;
    let sample = this.findSampleById(sampleID);

    //remember the referenceMaterial
    this.setState({
       referenceMaterial: sample
    });

    return this.updatedReactionWithSample(this.updatedSamplesForReferenceChange.bind(this), sample)
  }

  updatedReactionForAmountChange(changeEvent) {
    let {sampleID, amount} = changeEvent;
    let sample = this.findSampleById(sampleID);

    sample.amount_value = amount.value;
    sample.amount_unit = amount.unit;

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), sample)
  }

  updatedReactionForEquivalentChange(changeEvent) {
    let {sampleID, equivalent} = changeEvent;
    let sample = this.findSampleById(sampleID);

    sample.equivalent = equivalent;

    return this.updatedReactionWithSample(this.updatedSamplesForEquivalentChange.bind(this), sample)
  }

  updatedReactionWithSample(updateFunction, sample) {
    let {reaction} = this.state;
    reaction.starting_materials = updateFunction(reaction.starting_materials, sample);
    reaction.reactants = updateFunction(reaction.reactants, sample);
    reaction.products = updateFunction(reaction.products, sample);
    return reaction;
  }

  updatedSamplesForAmountChange(samples, updatedSample) {
    let referenceSample = this.state.referenceMaterial;

    return samples.map((sample) => {
      if (sample.id == updatedSample.id) {
        sample.amount_value = updatedSample.amount_value;
        sample.amount_unit = updatedSample.amount_unit;

        if(!updatedSample.reference && referenceSample.amount_value) {
          sample.equivalent = sample.amount_value / referenceSample.amount_value;
        } else {
          sample.equivalent = 1.0;
        }
      }
      else {
        if(updatedSample.reference) {
          if(sample.equivalent) {
            sample.amount_value = sample.equivalent * updatedSample.amount_value;
          }
        }
      }
      return sample;
    });
  }

  updatedSamplesForEquivalentChange(samples, updatedSample) {
    let referenceSample = this.state.referenceMaterial;

    return samples.map((sample) => {
      if (sample.id == updatedSample.id) {
        sample.equivalent = updatedSample.equivalent;
        if(referenceSample.amount_value) {
          sample.amount_value = updatedSample.equivalent * referenceSample.amount_value;
        }
        else if(sample.amount_value) {
          sample.amount_value = updatedSample.equivalent * sample.amount_value;
        }
      }
      return sample;
    });
  }

  updatedSamplesForReferenceChange(samples, referenceSample) {
    return samples.map((sample) => {
      if (sample.id == referenceSample.id) {
        sample.equivalent = 1.0;
        sample.reference = true;
      }
      else {
        if(sample.amount_value) {
          let referenceAmount = referenceSample.amount_value;
          if(referenceSample && referenceAmount) {
            sample.equivalent = sample.amount_value / referenceAmount;
          }
        }
        sample.reference = false;
      }
      return sample;
    });
  }

  findSampleById(sampleID) {
    let reaction = this.state.reaction;
    return [...reaction.starting_materials, ...reaction.reactants, ...reaction.products].find((sample) => {
      return sample.id == sampleID;
    })
  }

  // --

  dropSample(sample, materialGroup) {
    const {reaction} = this.state;
    const materials = reaction[materialGroup];
    materials.push(sample);
    this.setState({reaction});
  }

  deleteMaterial(material, materialGroup) {
    const {reaction} = this.state;
    const materials = reaction[materialGroup];
    const materialIndex = materials.indexOf(material);
    materials.splice(materialIndex, 1);
    this.setState({reaction});
  }

  dropMaterial(material, previousMaterialGroup, materialGroup) {
    const {reaction} = this.state;
    const materials = reaction[materialGroup];
    this.deleteMaterial(material, previousMaterialGroup);
    materials.push(material);
    this.setState({reaction});
  }

  _submitFunction() {
    //if(this.state.sample.id == '_new_') {
    //  this.createSample();
    //} else {
    //  this.updateSample();
    //}
  }

  _submitLabel() {
    if (this.state.reaction.id == '_new_') {
      return "Save Reaction";
    } else {
      return "Update Reaction";
    }
  }

  reactionIsValid() {
    //let sample = this.state.sample;
    //return sample && sample.molfile
  }

  closeDetails() {
    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollectionId}`);
  }

  render() {
    const {reaction} = this.state;
    return (
      <div>
        <Panel header="Reaction Details" bsStyle='primary'>
          <table width="100%" height="100px">
            <tr>
              <td width="70%">
                <h3>{reaction.name}</h3>
                <ElementCollectionLabels element={reaction} key={reaction.id}/>
              </td>
              <td width="30%">
                SVG
              </td>
            </tr>
          </table>
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
            <Button bsStyle="primary" onClick={() => this.closeDetails()}>Back</Button>
            <Button bsStyle="warning" onClick={() => this._submitFunction()}
                    disabled={!this.reactionIsValid()}>{this._submitLabel()}</Button>
          </ButtonToolbar>
        </Panel>
      </div>
    );
  }
}
