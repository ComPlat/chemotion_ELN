import React from 'react';
import {
  Button, Popover, Col, Checkbox, Panel, Form, ButtonGroup, OverlayTrigger, FormGroup, FormControl, ControlLabel, InputGroup
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';
import { CellLineDetailsStore } from 'src/stores/mobx/CellLineDetailsStore';

class GeneralPropertiesTab extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
  }

  componentDidMount() {

  }

  render() {
    const cellLineItem = this.context.cellLineDetailsStore.cellLines(1);
    return (

      <FormGroup controlId="myGroup">
        <Col componentClass={ControlLabel} sm={3}>Cell line id</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={cellLineItem.cellLineId} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Cell line name</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={cellLineItem.cellLineName} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={1}>Organism</Col>
        <Col sm={3}>
          <FormControl type="text" name="XXX" value={cellLineItem.organism} disabled />
        </Col>
        <Col componentClass={ControlLabel} sm={1}>Tissue</Col>
        <Col sm={3}>
          <FormControl type="text" name="XXX" value={cellLineItem.tissue} disabled />
        </Col>
        <Col componentClass={ControlLabel} sm={1}>Disease</Col>
        <Col sm={3}>
          <FormControl type="text" name="XXX" value={cellLineItem.disease} disabled />
        </Col>
        <Col sm={12}>..........</Col>
        <Col sm={12}>..........</Col>
        <Col sm={12}>..........</Col>

      </FormGroup>

    );
  }
}

export default observer(GeneralPropertiesTab);
