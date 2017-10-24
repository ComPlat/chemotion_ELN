import React from 'react';
import {ButtonGroup, Button} from 'react-bootstrap';
// import GateActions from '../actions/GateActions';

const GatePushBtn = ({collection_id})=>{
  const transmitting = () => {
    return fetch(`/api/v1/gate/transmitting/${collection_id}`, {
      credentials: 'same-origin',
      method: 'GET'
    }).then((response) => {
      return response.json()
    }).then((json) => {
      return json
    }).catch((errorMessage) => {
      console.log(errorMessage);
    })
  }
  return (
    <ButtonGroup>
      <Button bsStyle="success"  bsSize="xsmall" disabled onClick={transmitting}>
        <i className="fa fa-cloud"></i>
      </Button>
    </ButtonGroup>
  )
}

export default GatePushBtn
