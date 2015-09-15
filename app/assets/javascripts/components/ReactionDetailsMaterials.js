import React from 'react'
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Panel, ListGroup, ListGroupItem, Glyphicon, Table} from 'react-bootstrap';
import NumeralInputWithUnits from './NumeralInputWithUnits'

import { PropTypes } from 'react';
import { DragSource, DragDropContext } from 'react-dnd';

import HTML5Backend from 'react-dnd/modules/backends/HTML5';
class Board {
  /* ... */
}
export default DragDropContext(HTML5Backend)(Board);


// import { ItemTypes } from './Constants';

let ItemTypes = {
  REACTION_MATERIALS: 'REACTION_MATERIALS'
}

/**
 * Implements the drag source contract.
 */
const cardSource = {
  beginDrag(props) {
    return {
      text: props.text
    };
  }
};

/**
 * Specifies the props to inject into your component.
 */
function collect(connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging()
  };
}

const propTypes = {
  text: PropTypes.string.isRequired,

  // Injected by React DnD:
  isDragging: PropTypes.bool.isRequired,
  connectDragSource: PropTypes.func.isRequired
};

class ReactionDetailsMaterials extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      samples: props.samples || [],
      materialGroup: props.materialGroup
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      samples: nextProps.samples
    })
  }

  handleReferenceChange(event, sampleID) {
    let value = event.target.value;
    this.props.onChange(
      {
        type: 'referenceChanged',
        materialGroup: this.state.materialGroup,
        sampleID: sampleID,
        value: value
      }
    )
  }

  render() {
    const { isDragging, connectDragSource, text } = this.props;

    let rows = this.state.samples.map((sample)=> (
      <tr key={sample.id}>
        <td width="5%">
          <input
            type="radio"
            name="reference"
            onClick={(e) => this.handleReferenceChange(e, sample.id)}
          />
        </td>
        <td width="25%">{sample.name}</td>
        <td width="25%">{sample.molecule.sum_formular}</td>
        <td width="25%">
          <NumeralInputWithUnits
             key={sample.id}
             value={sample.amount_value}
             unit={sample.amount_unit || 'g'}
             units={['g', 'ml', 'mol']}
             numeralFormat='0,0.00'
             convertValueFromUnitToNextUnit={(unit, nextUnit, value) => this.handleUnitChanged(unit, nextUnit, value)}
             onChange={(amount) => this.handleAmountChanged(amount)}
          />
        </td>
        <td width="20%">
          <Input type="text" key={sample.id} value={sample.equivalent} disabled />
        </td>
      </tr>
    ));

    return connectDragSource(
      <Table width="100%">
        <thead>
          <th>Ref</th>
          <th>Name</th>
          <th>Molecule</th>
          <th>Amount</th>
          <th>Equi</th>
        </thead>
        <tbody>
          {rows}
        </tbody>
      </Table>
    )
  }
}

ReactionDetailsMaterials.propTypes = propTypes;

// Export the wrapped component:
export default DragSource(ItemTypes.REACTION_MATERIALS, cardSource, collect)(ReactionDetailsMaterials);
