import React from 'react';
import PropTypes from 'prop-types';

const PubchemLabels = ({element}) =>{
  let cid = element.pubchem_tag && element.pubchem_tag.pubchem_cid
  let labelStyle = {};
  if (!cid) {labelStyle.WebkitFilter = "grayscale(100%)"}
  const handleOnClick = (e) => {
    if (!!cid){
      window.open("https://pubchem.ncbi.nlm.nih.gov/compound/" + cid, '_blank')
    }
    e.stopPropagation()
  }
  return (
    <img
      src="/images/wild_card/pubchem.svg"
      className="pubchem-logo"
      onClick={handleOnClick}
      style={labelStyle}
    />
  )
}

PubchemLabels.propTypes = {
  element: PropTypes.object,
}

export default PubchemLabels;
