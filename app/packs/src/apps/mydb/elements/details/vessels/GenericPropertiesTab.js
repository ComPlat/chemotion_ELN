import React from 'react';
import {
  Button, Popover, Col, Checkbox, Panel, Form, ButtonGroup, OverlayTrigger, FormGroup, FormControl, ControlLabel, InputGroup
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

class GenericPropertiesTab extends React.Component {
  static contextType = StoreContext;

  constructor(props) {
    super(props);
  }

  componentDidMount() {

  }
  
  render() {
    const vesselItem = this.context.vesselDetailsStore.vessels(this.props.item.id);
    return (
      <FormGroup>
        <Col componentClass={ControlLabel} sm={3}>Vessel Template ID</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselTemplateId} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Vessel ID</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselId} disabled />
        </Col>
      </FormGroup>
    )
  }
}

export default observer(GenericPropertiesTab);