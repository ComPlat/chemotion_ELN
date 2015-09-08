import React from 'react'
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Panel, ListGroup, ListGroupItem, Glyphicon} from 'react-bootstrap';

import NumeralInputWithUnits from './NumeralInputWithUnits'
import ElementCollectionLabels from './ElementCollectionLabels';

import ElementStore from './stores/ElementStore';

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

    return (
      <div>
        <Panel header="Reaction Details" bsStyle='primary'>
          <table width="100%" height="190px"><tr>
            <td width="70%">
              <h3>{reaction.name}</h3>

              <ElementCollectionLabels element={reaction} key={reaction.id} />
            </td>
            <td width="30%">
              SVG
            </td>
          </tr></table>
          <ListGroup fill>
            <ListGroupItem>
            </ListGroupItem>
          </ListGroup>
        </Panel>
      </div>
    )
  }
}
