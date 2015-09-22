import React from 'react'
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Panel, ListGroup, ListGroupItem, Glyphicon, Table} from 'react-bootstrap';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';

import ElementStore from './stores/ElementStore';
import ReactionDetailsMaterials from './ReactionDetailsMaterials';
import ReactionDetailsLiteratures from './ReactionDetailsLiteratures';

export default class ReactionDetails extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      reaction: props.reaction
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    if(!state.currentElement || state.currentElement.type == 'reaction') {
      this.setState({
        reaction: state.currentElement
      });
    }
  }

  handleMaterialsChange(change) {
    switch (change.type) {
      case 'referenceChanged':
        this.setState({
          reaction: this.updatedReactionForReferenceChange(change)
        })
        break;
    }
  }

  updatedReactionForReferenceChange(change) {
    let {reaction} = this.state;
    let {sampleID} = change;

    reaction.starting_materials = this.updatedSamplesForReferenceChange(reaction.starting_materials, sampleID);
    reaction.reactants = this.updatedSamplesForReferenceChange(reaction.reactants, sampleID);
    reaction.products = this.updatedSamplesForReferenceChange(reaction.products, sampleID);
    return reaction;
  }

  updatedSamplesForReferenceChange(samples, sampleID) {
    return samples.map((sample)=>{
     if(sample.id == sampleID) {
       sample.equivalent = 1.0;
     } else {
       //TODO replace dummmy calculation
       sample.equivalent = 2.0;
     }
     return sample;
   });
  }

  render() {
    let reaction = this.state.reaction;
    return (
      <div>
        <Panel header="Reaction Details" bsStyle='primary'>
          <table width="100%" height="100px">
            <tr>
              <td width="70%">
                <h3>{reaction.name}</h3>
                <ElementCollectionLabels element={reaction} key={reaction.id} />
              </td>
              <td width="30%">
                SVG
              </td>
            </tr>
          </table>
          <ListGroup fill>
            <ListGroupItem header='Starting Materials'>
              <ReactionDetailsMaterials materialGroup="starting_materials" samples={reaction.starting_materials} onChange={this.handleMaterialsChange.bind(this)}/>
            </ListGroupItem>
            <ListGroupItem header='Reactants'>
              <ReactionDetailsMaterials materialGroup="reactants" samples={reaction.reactants} onChange={this.handleMaterialsChange.bind(this)}/>
            </ListGroupItem>
            <ListGroupItem header='Products'>
              <ReactionDetailsMaterials materialGroup="products" samples={reaction.products} onChange={this.handleMaterialsChange.bind(this)}/>
            </ListGroupItem>
            <ListGroupItem header='Literatures'>
              <ReactionDetailsLiteratures reaction_id={reaction.id} literatures={reaction.literatures}/>
            </ListGroupItem>
          </ListGroup>
        </Panel>
      </div>
    )
  }
}
