import React from 'react'
import {Panel, ListGroup, ListGroupItem, ButtonToolbar, Button} from 'react-bootstrap';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';

import ElementStore from './stores/ElementStore';
import ReactionDetailsMaterials from './ReactionDetailsMaterials';
import ReactionDetailsLiteratures from './ReactionDetailsLiteratures';
import UIStore from './stores/UIStore';
import Aviator from 'aviator';

export default class ReactionDetails extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      reaction: props.reaction
    }
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

  handleMaterialsChange(materials, materialGroup) {
    const {reaction} = this.state;
    switch (materialGroup) {
      case 'starting_materials':
        reaction.starting_materials = materials;
        break;
      case 'reactants':
        reaction.reactants = materials;
        break;
      case 'products':
        reaction.products = materials;
        break;
    }
    this.setState({reaction});
    console.log(this.state.reaction);
  }

  removeMaterialFromMaterialGroup(material, materialGroup) {
    const {reaction} = this.state;
    const {starting_materials, reactants, products} = reaction;
    let materialIndex;
    switch (materialGroup) {
      case 'starting_materials':
        materialIndex = starting_materials.indexOf(material);
        starting_materials.splice(materialIndex, 1);
        break;
      case 'reactants':
        materialIndex = reactants.indexOf(material);
        reactants.splice(materialIndex, 1);
        break;
      case 'products':
        materialIndex = products.indexOf(material);
        products.splice(materialIndex, 1);
        break;
    }
    this.setState({reaction});
    console.log(this.state.reaction);
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
              <ReactionDetailsMaterials
                materialGroup="starting_materials"
                materials={reaction.starting_materials}
                removeMaterialFromMaterialGroup={(material, materialGroup) => this.removeMaterialFromMaterialGroup(material, materialGroup)}
                handleMaterialsChange={(materials, materialGroup) => this.handleMaterialsChange(materials, materialGroup)}/>
            </ListGroupItem>
            <ListGroupItem header="Reactants">
              <ReactionDetailsMaterials
                materialGroup="reactants"
                materials={reaction.reactants}
                removeMaterialFromMaterialGroup={(material, materialGroup) => this.removeMaterialFromMaterialGroup(material, materialGroup)}
                handleMaterialsChange={(materials, materialGroup) => this.handleMaterialsChange(materials, materialGroup)}/>
            </ListGroupItem>
            <ListGroupItem header="Products">
              <ReactionDetailsMaterials
                materialGroup="products"
                materials={reaction.products}
                removeMaterialFromMaterialGroup={(material, materialGroup) => this.removeMaterialFromMaterialGroup(material, materialGroup)}
                handleMaterialsChange={(materials, materialGroup) => this.handleMaterialsChange(materials, materialGroup)}/>
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
