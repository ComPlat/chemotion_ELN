import React from 'react'
import {Button, ButtonGroup, ButtonToolbar, FormControls, Input, Modal, Panel, ListGroup, ListGroupItem, Glyphicon, Table} from 'react-bootstrap';
import NumeralInputWithUnits from './NumeralInputWithUnits'

export default class ReactionDetailsMaterials extends React.Component {

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

    return (
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
