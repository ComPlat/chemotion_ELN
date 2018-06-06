import React from 'react';
import {
  Form, FormGroup, Row, Col, ControlLabel, Grid
} from 'react-bootstrap';

function SampleComputedProps({ cprop }) {
  return (
    <Grid style={{ width: '100%' }}>
      <Row>
        <Col xs={18} md={12}>
          <Form horizontal>
            <FormGroup>
              <Col sm={6}>
                <ControlLabel>Maximum potential: </ControlLabel>
                {` ${cprop.max_potential} mV`}
              </Col>
              <Col sm={6}>
                <ControlLabel>Minimum potential: </ControlLabel>
                {` ${cprop.min_potential} mV`}
              </Col>
            </FormGroup>
            <FormGroup>
              <Col sm={6}>
                <ControlLabel>Mean potential: </ControlLabel>
                {` ${cprop.mean_potential} mV`}
              </Col>
              <Col sm={6}>
                <ControlLabel>Mean absolute potential: </ControlLabel>
                {` ${cprop.mean_abs_potential} mV`}
              </Col>
            </FormGroup>
            <FormGroup>
              <Col sm={3}>
                <ControlLabel>HOMO: </ControlLabel>
                {` ${cprop.homo} eV`}
              </Col>
              <Col sm={3}>
                <ControlLabel>LUMO: </ControlLabel>
                {` ${cprop.lumo} eV`}
              </Col>
              <Col sm={3}>
                <ControlLabel>IP: </ControlLabel>
                {` ${cprop.ip} eV`}
              </Col>
              <Col sm={3}>
                <ControlLabel>EA: </ControlLabel>
                {` ${cprop.ea} eV`}
              </Col>
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
