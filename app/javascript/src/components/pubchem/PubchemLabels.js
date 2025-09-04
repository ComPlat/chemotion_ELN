import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

const PubchemLabels = ({element}) =>{
  let cid = element.pubchem_tag && element.pubchem_tag.pubchem_cid
  const handleOnClick = (e) => {
    if (!!cid){
      window.open("https://pubchem.ncbi.nlm.nih.gov/compound/" + cid, '_blank')
    }
    e.stopPropagation()
  }
  return (
    <Button disabled={!cid} variant="light" size="xxsm" onClick={handleOnClick} title={cid ? `PubChem CID: ${cid}` : "No PubChem CID assigned"}>
      <i className="icon-pubchem" />
    </Button>
  )
}

PubchemLabels.propTypes = {
  element: PropTypes.object,
}

export default PubchemLabels;
