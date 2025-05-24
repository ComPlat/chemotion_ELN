import React from 'react';
import {
    FormGroup, OverlayTrigger, ControlLabel, FormControl, Tooltip,
    Row, Col, Button
  } from 'react-bootstrap';




const SCSButton = () => {
  
    const onClick = () => {
      const params = {
        inpChem: inpChem
  
      }
      console.log(params)
      // RetroActions.expand.defer(params);
    };
    return (
      <Button
        bsStyle="primary"
        bsSize="xsmall"
        // disabled={disableBtn}
        onClick={onClick}
      >
        <span><i className="fa fa-file-text-o"/> SCS Score</span>
      </Button>
    );
  };
  
const SCSform = ({ inpChem, outputEls }) => {
return (
    <div className='panel-workspace'>    
    <Col xs lg="5">
    {/* <FormGroup> */}
        <ControlLabel>
            Input Chemical
        </ControlLabel>
    <Row>
        <FormControl
        type="text"
    // value={reactant}
    // onChange={ForwardActions.updateReactant}
        /></Row> 
    <br></br>
    {/* </FormGroup>   */}
    <Row>
    <div>
    <SCSButton
    key="Get SCS Score"
    // retroState={retroState}
    />,
    </div></Row>
    </Col>
    </div>

);
}



export default SCSform;