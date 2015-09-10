import React from 'react'
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Panel, ListGroup, ListGroupItem, Glyphicon, Table} from 'react-bootstrap';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';

import ElementStore from './stores/ElementStore';
import ReactionDetailsMaterials from './ReactionDetailsMaterials';

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

  render() {
    let reaction = this.state.reaction
    console.log(reaction.starting_materials[0]);

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
              <ReactionDetailsMaterials materialGroup="starting" samples={reaction.starting_materials}/>
            </ListGroupItem>
            <ListGroupItem header='Reactants'>
              <ReactionDetailsMaterials materialGroup="reactants" samples={reaction.reactants}/>
            </ListGroupItem>
            <ListGroupItem header='Products'>
              <ReactionDetailsMaterials materialGroup="products" samples={reaction.products}/>
            </ListGroupItem>
          </ListGroup>
        </Panel>
      </div>
    )
  }
}
