import React from 'react';
import {
  Col, FormGroup, FormControl, ControlLabel
} from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

class GeneralPropertiesTab extends React.Component {
  static contextType = StoreContext;

  render() {
    const cellLineItem = this.context.cellLineDetailsStore.cellLines(this.props.item.id);
    return (

      <FormGroup controlId="myGroup">
        <Col componentClass={ControlLabel} sm={3}>Amount</Col>
        <Col sm={9}>
          <FormControl
            type="text"
            name="XXX"
            defaultValue={cellLineItem.amount}
            onChange={(e) => this.context.cellLineDetailsStore.changeAmountOfCellLine(this.props.item.id, Number(e.target.value))}
          />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Passage</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={cellLineItem.amount} />
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

export default observer(GeneralPropertiesTab);
