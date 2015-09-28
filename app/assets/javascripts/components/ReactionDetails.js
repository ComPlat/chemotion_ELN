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

  //handleMaterialsChange(change) {
  //  switch (change.type) {
  //    case 'referenceChanged':
  //      this.setState({
  //        reaction: this.updatedReactionForReferenceChange(change)
  //      });
  //      break;
  //  }
  //}
  //
  //updatedReactionForReferenceChange(change) {
  //  let {reaction} = this.state;
  //  let {sampleID} = change;
  //
  //  reaction.starting_materials = this.updatedSamplesForReferenceChange(reaction.starting_materials, sampleID);
  //  reaction.reactants = this.updatedSamplesForReferenceChange(reaction.reactants, sampleID);
  //  reaction.products = this.updatedSamplesForReferenceChange(reaction.products, sampleID);
  //  return reaction;
  //}

  //updatedSamplesForReferenceChange(samples, sampleID) {
  //  return samples.map((sample)=> {
  //    if (sample.id == sampleID) {
  //      sample.equivalent = 1.0;
  //    } else {
  //      //TODO replace dummmy calculation
  //      sample.equivalent = 2.0;
  //    }
  //    return sample;
  //  });
  //}

  handleReferenceMaterialChange() {
    // TODO
  }

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
                />
            </ListGroupItem>
            <ListGroupItem header="Reactants">
              <MaterialGroupContainer
                materialGroup="reactants"
                materials={reaction.reactants}
                dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
                deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
                dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}/>
            </ListGroupItem>
            <ListGroupItem header="Products">
              <MaterialGroupContainer
                materialGroup="products"
                materials={reaction.products}
                dropMaterial={(material, previousMaterialGroup, materialGroup) => this.dropMaterial(material, previousMaterialGroup, materialGroup)}
                deleteMaterial={(material, materialGroup) => this.deleteMaterial(material, materialGroup)}
                dropSample={(sample, materialGroup) => this.dropSample(sample, materialGroup)}/>
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
