import React, {Component} from 'react';
import {ListGroup, ListGroupItem} from 'react-bootstrap';
import MaterialGroupContainer from './MaterialGroupContainer';
import Reaction from './models/Reaction';
import Sample from './models/Sample';

export default class ReactionDetailsScheme extends Component {

  constructor(props) {
    super(props);
    const {reaction} = props;
    this.state = { reaction };
  }

  componentWillReceiveProps(nextProps) {
    const {reaction} = this.state;
    const nextReaction = nextProps.reaction;
    this.setState({ reaction: nextReaction });
  }

  dropSample(sample, materialGroup) {
    const {reaction} = this.state;
    const materials = reaction[materialGroup];
    const splitSample = Sample.buildChild(sample);
    materials.push(splitSample);
    this.changeReaction(reaction);
  }

  deleteMaterial(material, materialGroup) {
    const {reaction} = this.state;
    const materials = reaction[materialGroup];
    const materialIndex = materials.indexOf(material);
    materials.splice(materialIndex, 1);
    this.changeReaction(reaction);
  }

  dropMaterial(material, previousMaterialGroup, materialGroup) {
    const {reaction} = this.state;
    const materials = reaction[materialGroup];
    this.deleteMaterial(material, previousMaterialGroup);
    materials.push(material);
    this.changeReaction(reaction);
  }

  changeReaction(reaction) {
    this.props.changeReaction(reaction);
  }

  handleMaterialsChange(changeEvent) {
    switch (changeEvent.type) {
      case 'referenceChanged':
        this.changeReaction(
          this.updatedReactionForReferenceChange(changeEvent)
        );
        break;
      case 'amountChanged':
        this.changeReaction(
          this.updatedReactionForAmountChange(changeEvent)
        );
        break;
      case 'equivalentChanged':
        this.changeReaction(
          this.updatedReactionForEquivalentChange(changeEvent)
        );
        break;
    }
  }

  updatedReactionForReferenceChange(changeEvent) {
    const {sampleID} = changeEvent;
    const {reaction} = this.state;
    const sample = reaction.sampleById(sampleID);
    reaction.markSampleAsReference(sampleID);

    return this.updatedReactionWithSample(this.updatedSamplesForReferenceChange.bind(this), sample)
  }

  updatedReactionForAmountChange(changeEvent) {
    let {sampleID, amount} = changeEvent;
    let updatedSample = this.props.reaction.sampleById(sampleID);

    // normalize to milligram
    updatedSample.setAmountAndNormalizeToMilligram(amount.value, amount.unit);

    return this.updatedReactionWithSample(this.updatedSamplesForAmountChange.bind(this), updatedSample)
  }

  updatedReactionForEquivalentChange(changeEvent) {
    let {sampleID, equivalent} = changeEvent;
    let updatedSample = this.props.reaction.sampleById(sampleID);

    updatedSample.equivalent = equivalent;

    return this.updatedReactionWithSample(this.updatedSamplesForEquivalentChange.bind(this), updatedSample)
  }

  updatedSamplesForAmountChange(samples, updatedSample) {
    const {referenceMaterial} = this.props.reaction;
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
    const {referenceMaterial} = this.props.reaction;
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

  updatedReactionWithSample(updateFunction, updatedSample) {
    const {reaction} = this.state;
    reaction.starting_materials = updateFunction(reaction.starting_materials, updatedSample);
    reaction.reactants = updateFunction(reaction.reactants, updatedSample);
    reaction.products = updateFunction(reaction.products, updatedSample);
    return reaction;
  }

  render() {
    const {reaction} = this.state;
    return (
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
        </ListGroup>
    );
  }
}
