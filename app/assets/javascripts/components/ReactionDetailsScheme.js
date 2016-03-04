import React, {Component} from 'react';
import {Button, ListGroup, ListGroupItem} from 'react-bootstrap';
import MaterialGroupContainer from './MaterialGroupContainer';
import Reaction from './models/Reaction';
import Sample from './models/Sample';

import ReactionDetailsMainProperties from './ReactionDetailsMainProperties';

import ElementActions from './actions/ElementActions';
import UsersFetcher from './fetchers/UsersFetcher';

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
    const splitSample = sample.buildChild();
    reaction.addMaterial(splitSample, materialGroup);
    this.onReactionChange(reaction, {schemaChanged: true});
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

  updatedSamplesForAmountChange(samples, updatedSample) {
    const {referenceMaterial} = this.props.reaction;
    return samples.map((sample) => {
      if (sample.id == updatedSample.id) {
        sample.setAmountAndNormalizeToMilligram(updatedSample.amount_value, updatedSample.amount_unit);
        if(referenceMaterial && sample.amountType != 'real') {
          if(!updatedSample.reference && referenceMaterial.amount_value) {
            sample.equivalent = sample.amount_mmol / referenceMaterial.amount_mmol;
          } else {
            sample.equivalent = 1.0;
          }
        }
      }
      else {
        if(updatedSample.reference) {
          if(sample.equivalent && sample.amountType != 'real') {
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

  /**
   * Add a (not yet persisted) sample to a material group
   * of the given reaction
   */
  addSampleToMaterialGroup(reaction, materialGroup) {
    UsersFetcher.fetchCurrentUser().then((result) => {
      reaction.initializeTemporarySampleCounter(result.user);

      ElementActions.addSampleToMaterialGroup({
        reaction,
        materialGroup
      });
    });
  }

  render() {
    const {reaction} = this.state;
    return (
      <div>
        <ListGroup fill>
          <ListGroupItem>
            <h4 className="list-group-item-heading" >Starting Materials</h4>
            <MaterialGroupContainer
              materialGroup="starting_materials"
              materials={reaction.starting_materials}
              dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
              deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
              dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
              />
              <Button onClick={() => this.addSampleToMaterialGroup(reaction, 'starting_materials')}>Add Sample</Button>
          </ListGroupItem>
          <ListGroupItem>
            <h4 className="list-group-item-heading" >Reactants</h4>
            <MaterialGroupContainer
              materialGroup="reactants"
              materials={reaction.reactants}
              dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
              deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
              dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
              />
              <Button onClick={() => this.addSampleToMaterialGroup(reaction, 'reactants')}>Add Sample</Button>
          </ListGroupItem>
          <ListGroupItem>
            <h4 className="list-group-item-heading" >Products</h4>
            <MaterialGroupContainer
              materialGroup="products"
              materials={reaction.products}
              dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
              deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
              dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}
              onChange={(changeEvent) => this.handleMaterialsChange(changeEvent)}
              />
              <Button onClick={() => this.addSampleToMaterialGroup(reaction, 'products')}>Add Sample</Button>
          </ListGroupItem>
        </ListGroup>
        <ReactionDetailsMainProperties
          reaction={reaction}
          onReactionChange={reaction => this.onReactionChange(reaction)}
          />
      </div>
    );
  }
}
