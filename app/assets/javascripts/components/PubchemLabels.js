import React from 'react';
import SVG from 'react-inlinesvg';

export default class PubchemLabels extends React.Component {
  constructor(props) {
    super(props)

    let {element} = props
    this.has_pubchem = true
    if (!element.pubchem_tag || !element.pubchem_tag.pubchem_cid)
      this.has_pubchem = false

    this.handleOnClick = this.handleOnClick.bind(this)
  }

  handleOnClick(e) {
    let {element} = this.props

    if (this.has_pubchem) {
      let cid = element.pubchem_tag.pubchem_cid

      window.open("https://pubchem.ncbi.nlm.nih.gov/compound/" + cid, '_blank')
    }

    e.stopPropagation()
  }

  render() {
    let {element, color} = this.props

    let pubchemLogo = "/images/pubchem.svg"
    let pubchem = (
      <img src={pubchemLogo} className="pubchem-logo" /> 
    )

    let labelStyle = {
      display: 'inline-block',
      marginLeft: "5px",
      marginRight: "5px"
    }
    if (this.has_pubchem == false) labelStyle.WebkitFilter = "grayscale(100%)"

    return (
      <span style={labelStyle} onClick={this.handleOnClick}>
        {pubchem}
      </span>
    )
  }
}
