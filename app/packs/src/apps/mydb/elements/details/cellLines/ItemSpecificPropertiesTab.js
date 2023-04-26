import React from 'react';
import {
  Col, FormGroup, FormControl, ControlLabel
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';

export default class GeneralPropertiesTab extends React.Component {
  static contextType = StoreContext;

  render() {
    const cellLineItem = this.context.cellLineDetailsStore.cellLines(1);
    return (

      <FormGroup controlId="myGroup">
        <Col componentClass={ControlLabel} sm={3}>Amount</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={cellLineItem.amount} />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Passage</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={cellLineItem.passage} />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Contamination</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={cellLineItem.contamination} />
        </Col>
        <Col componentClass={ControlLabel} sm={2}>Source</Col>
        <Col sm={4}>
          <FormControl type="text" name="XXX" value={cellLineItem.source} />
        </Col>
        <Col componentClass={ControlLabel} sm={2}>Growth medium</Col>
        <Col sm={4}>
          <FormControl type="text" name="XXX" value={cellLineItem.growthMedium} />
        </Col>
        <Col sm={12}>..........</Col>
        <Col sm={12}>..........</Col>
        <Col sm={12}>..........</Col>
      </FormGroup>
    );
  }
}
