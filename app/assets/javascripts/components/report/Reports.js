import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Alert, Label, Table} from 'react-bootstrap';
import {DescriptionContent, SVGContent, MaterialContent, PropertyContent, TLCContent, LiteratureContent } from './ReactElements';

const Reports = ({selectedReactions, settings}) => {
  let reactions = selectedReactions.map( (reaction, i) => {
    return (
      <Report key={i} reaction={reaction} settings={settings}/>
    )
  })
  return (
    <div> {reactions} </div>
  )
}

const Report = ({reaction, settings}) => {
  const {name, description, literatures, starting_materials, reactants,
         products, dangerous_products, purification,
         observation, reaction_svg_file, tlc_description } = reaction

  const settings_obj = settings.reduce((o, {text, checked} ) => {
    o[text] = checked
    return o
  }, {})

  return (
    <div>
      <Alert bsStyle='success' style={{textAlign: 'center', backgroundColor: '#428bca', color:'white', border:'none'}}> {name} </Alert>

      <DescriptionContent show={settings_obj.description} description={description} />
      <SVGContent show={settings_obj.reaction} reaction_svg_file={reaction_svg_file} />
      <MaterialContent  show={settings_obj.material}
                        starting_materials={starting_materials}
                        reactants={reactants}
                        products={products} />
      <PropertyContent  show={settings_obj.properties}
                        observation={observation}
                        purification={purification}
                        dangerous_products={dangerous_products} />
      <TLCContent show={settings_obj["tlc-control"]} tlc_description={tlc_description} />
      <LiteratureContent show={settings_obj.literature} literatures={literatures} />
    </div>
  )
}

export default Reports
