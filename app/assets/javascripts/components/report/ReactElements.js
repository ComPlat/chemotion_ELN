import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Label, Table} from 'react-bootstrap';

const SVGContent = ({show, reaction_svg_file}) => {
  const svg_file =reaction_svg_file && `/images/reactions/${reaction_svg_file}`
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> Reaction </Label></h4>
        <SVG key={svg_file} src={svg_file} className='reaction-details'/>
      </div>
      : null
  )
}

const MaterialContent = ({show, starting_materials, reactants, products}) => {
  const materailCalc = (target, multi, precision) => {
    return (target ? (target*multi).toFixed(precision) : " - ")
  }
  const rows = (material) => {
    return material.map((sample, i) => {
      return (
        <tbody key={i}>
          <tr>
            <td colSpan="5"><i className="fa fa-arrow-circle-right"></i>   {sample.molecule.iupac_name}</td>
          </tr>
          <tr>
            <td>{sample.molecule.sum_formular}</td>
            <td>{materailCalc(sample.amount_g, 1000, 4)}</td>
            <td>{materailCalc(sample.amount_l, 1000, 4)}</td>
            <td>{materailCalc(sample.amount_mol, 1000, 4)}</td>
            <td>{materailCalc(sample.equivalent, 1, 4)}</td>
          </tr>
        </tbody>
      )
    })
  }
  const table = (rows) => {
    return (
      <Table striped condensed hover>
        <thead>
          <tr>
            <th>Formula</th>
            <th>Mass(mg)</th>
            <th>Vol(ml)</th>
            <th>Amount(mmol)</th>
            <th>Equiv/Yield</th>
          </tr>
        </thead>
        {rows}
      </Table>
    )
  }
  return (
    show ?
      <div>
        <h4><Label bsStyle="success"> Sarting Materials </Label></h4>
        <div> {table(rows(starting_materials))} </div>
        <h4><Label bsStyle="warning"> Reactants </Label></h4>
        <div> {table(rows(reactants))} </div>
        <h4><Label bsStyle="danger"> Products </Label></h4>
        <div> {table(rows(products))} </div>
      </div>
      : null
  )
}

const DescriptionContent = ({show, description}) => {
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> Description </Label></h4>
        <p>{description}</p>
      </div>
      : null
  )
}

const PurificationContent = ({show, purification}) => {
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> Purification </Label></h4>
        <div>
          {purification.join(", ")}
        </div>
      </div>
      : null
  )
}
const TLCContent = ({show, tlc_description, tlc_solvents, rf_value}) => {
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> TLC - Control </Label></h4>
        <p> <b>rf_value:</b> {rf_value} </p>
        <p> <b>TLC_solvents:</b> {tlc_solvents} </p>
        <div> {tlc_description} </div>
      </div>
      : null
  )
}

const ObservationContent = ({show, observation}) => {
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> Observation </Label></h4>
        <p>{observation}</p>
      </div>
      : null
  )
}

const AnalysesContent = ({show, products}) => {
  const analyses = products.map((product, i) => {
    return (
      product.analyses.map((analysis, j) => {
        return (
          analysis ?
            <div key={i*100+j}>
              <p><b>{product.molecule.sum_formular}</b> ({analysis.kind})</p>
              <p><u>Content:</u> {analysis.content}</p>
              <p><u>Description:</u> {analysis.description}</p>
            </div>
          : null
        )
      })
    )
  })
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> Analysis </Label></h4>
        <div>{analyses}</div>
      </div>
      : null
  )
}

const LiteratureContent = ({show, literatures}) => {
  const rows = literatures.map((literature, i) => {
    return (
      <tr key={i}>
        <td>{literature.title}</td>
        <td>{literature.url}</td>
      </tr>
    )
  })
  const table = <Table striped condensed hover>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows}
                  </tbody>
                </Table>
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> Literatures </Label></h4>
        <div> {table} </div>
      </div>
      : null
  )
}

export {SVGContent, MaterialContent, DescriptionContent, PurificationContent, TLCContent, ObservationContent, AnalysesContent, LiteratureContent}
