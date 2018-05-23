import React from 'react';
import {
  Form, FormGroup, FormControl, Row, Col, ControlLabel, Grid
} from 'react-bootstrap';

function SampleComputedProps({ cprop }) {
  return (
    <Grid style={{ width: '100%' }}>
      <Row>
        <Col xs={9} md={6}>
          <Form>
            <FormGroup>
              <ControlLabel>Maximum potential</ControlLabel>
              <FormControl.Static>{cprop.max_potential} mV</FormControl.Static>
            </FormGroup>
            <FormGroup>
              <ControlLabel>Minimum potential</ControlLabel>
              <FormControl.Static>{cprop.min_potential} mV</FormControl.Static>
            </FormGroup>
            <FormGroup>
              <ControlLabel>Mean potential</ControlLabel>
              <FormControl.Static>{cprop.mean_potential} mV</FormControl.Static>
            </FormGroup>
            <FormGroup>
              <ControlLabel>Mean absolute potential</ControlLabel>
              <FormControl.Static>{cprop.mean_abs_potential} mV</FormControl.Static>
            </FormGroup>
          </Form>
        </Col>
        <Col xs={9} md={6}>
          <Form>
            <FormGroup>
              <ControlLabel>HOMO</ControlLabel>
              <FormControl.Static>{cprop.homo} eV</FormControl.Static>
            </FormGroup>
            <FormGroup>
              <ControlLabel>LUMO</ControlLabel>
              <FormControl.Static>{cprop.lumo} eV</FormControl.Static>
            </FormGroup>
            <FormGroup>
              <ControlLabel>IP</ControlLabel>
              <FormControl.Static>{cprop.ip} eV</FormControl.Static>
            </FormGroup>
            <FormGroup>
              <ControlLabel>EA</ControlLabel>
              <FormControl.Static>{cprop.ea} eV</FormControl.Static>
            </FormGroup>
          </Form>
        </Col>
      </Row>
    </Grid>
  );
}

SampleComputedProps.propTypes = {
  cprop: React.PropTypes.object.isRequired,
};

export default SampleComputedProps;
