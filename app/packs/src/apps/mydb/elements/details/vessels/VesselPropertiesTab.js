import React from 'react';
import {
  Button, Popover, Col, Checkbox, Panel, Form, ButtonGroup, OverlayTrigger, FormGroup, FormControl, ControlLabel, InputGroup
} from 'react-bootstrap';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

class VesselPropertiesTab extends React.Component {
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
        {/* Vessel Template */}
        
        <Col componentClass={ControlLabel} sm={3}>Vessel Template ID</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselTemplateId} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Vessel Template Name</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselTemplateName} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Vessel Template Details</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselTemplateDetails} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Vessel Type</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselType} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Volume</Col>
        <Col sm={6}>
          <FormControl type="text" name="XXX" value={vesselItem.volumeAmount} disabled />
        </Col>
        <Col sm={3}>
          <FormControl type="text" name="XXX" value={vesselItem.volumeUnit} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Material</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.materialType} disabled />
        </Col>

        {/* Vessel Details */}

        <Col componentClass={ControlLabel} sm={3}>Vessel ID</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselId} disabled />
        </Col>

        <Col componentClass={ControlLabel} sm={3}>Vessel Name</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselName} disabled />
        </Col>
        
        <Col componentClass={ControlLabel} sm={3}>Vessel Description</Col>
        <Col sm={9}>
          <FormControl type="text" name="XXX" value={vesselItem.vesselDescription} disabled />
        </Col>
      </FormGroup>
    )
  }
}

export default observer(VesselPropertiesTab);