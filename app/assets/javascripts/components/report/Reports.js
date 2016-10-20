import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Alert, Label, Table} from 'react-bootstrap';
import {SVGContent, MaterialContent, DescriptionContent,
        PurificationContent, TLCContent, ObservationContent,
        AnalysesContent, LiteratureContent, SolventContent,
        StatusContent} from './ReportElements';

const Reports = ({selectedReactions, settings, configs}) => {
  let reactions = selectedReactions.map( (reaction, i) => {
    return (
      <Report key={i} reaction={reaction} settings={settings} configs={configs}/>
    )
  })
  return (
    <div> {reactions} </div>
  )
}

const Report = ({reaction, settings, configs}) => {
  const {description, literatures, starting_materials, reactants,
         products, solvents, solvent, dangerous_products, purification,
         observation, reaction_svg_file, tlc_description,
         tlc_solvents, rf_value, status } = reaction

  const settings_obj = settings.reduce((o, {text, checked} ) => {
    const o_title = text.replace(/\s+/g, '').substring(0, 12);
    o[o_title] = checked
    return o
  }, {})

  const configs_obj = configs.reduce((o, {text, checked} ) => {
    const o_title = text.replace(/\s+/g, '').substring(0, 12);
    o[o_title] = checked
    return o
  }, {})

  const has_analyses = products.map( sample => {
    if(sample.analyses.length != 0) {
      return true
    }
  }).filter(r => r!=null).length != 0

  return (
    <div>
      <Alert bsStyle='success' style={{ textAlign: 'center',
                                        backgroundColor: '#428bca',
                                        color:'white',
                                        border:'none'}}> {reaction.short_label}
        <StatusContent status={status}/>
      </Alert>

      <SVGContent show={settings_obj.formula}
                  reaction_svg_file={reaction_svg_file}
                  isProductOnly={!configs_obj.Showallmater}
                  products={products} />
      <MaterialContent  show={settings_obj.material}
                        starting_materials={starting_materials}
                        reactants={reactants}
                        products={products} />
      <SolventContent show={settings_obj.material}
                      solvents={solvents}
                      solvent={solvent} />
      <DescriptionContent show={settings_obj.description && description}
                          description={description} />
      <PurificationContent show={settings_obj.purification && purification.length != 0}
                           purification={purification} />
      <TLCContent show={settings_obj.tlc && tlc_description}
                  tlc_description={tlc_description}
                  tlc_solvents={tlc_solvents}
                  rf_value={rf_value} />
      <ObservationContent show={settings_obj.observation && observation}
                          observation={observation} />
      <AnalysesContent show={settings_obj.analysis && has_analyses}
                       products={products} />
      <LiteratureContent show={settings_obj.literature && literatures.length != 0}
                         literatures={literatures} />
    </div>
  )
}

export default Reports
