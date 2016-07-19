import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Label, Table} from 'react-bootstrap';

const SVGContent = ({show, reaction_svg_file}) => {
  const svg_file =reaction_svg_file && `/images/reactions/${reaction_svg_file}`
  return (
    show ?
      <div>
        <SVG key={svg_file} src={svg_file} className='reaction-details'/>
      </div>
      : null
  )
}

const MaterialContent = ({show, starting_materials, reactants, products}) => {
  const materailCalc = (target, multi, precision) => {
    return (target ? (target*multi).toFixed(precision) : " - ")
  }

  const equiv_or_yield = (s, isProduct) => {
    return (
      isProduct ?
      materailCalc(s.equivalent*100, 1, 2).toString() + "%"
      :
      materailCalc(s.equivalent, 1, 4)
    )
  }

  const rows = (material, isProduct) => {
    return material.map((sample, i) => {
      return (
        <tbody key={i}>
          <tr>
            <td colSpan="5">
              <i className="fa fa-arrow-circle-right"></i>
              {sample.molecule.iupac_name}
              ({sample.short_label})
            </td>
          </tr>
          <tr>
            <td style={{width: '20%'}}>{sample.molecule.sum_formular}</td>
            <td style={{width: '20%'}}>{materailCalc(sample.amount_g, 1000, 4)}</td>
            <td style={{width: '20%'}}>{materailCalc(sample.amount_l, 1000, 4)}</td>
            <td style={{width: '20%'}}>{materailCalc(sample.amount_mol, 1000, 4)}</td>
            <td style={{width: '20%'}}>{equiv_or_yield(sample, isProduct)}</td>
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
        <div> {table(rows(starting_materials, false))} </div>
        <h4><Label bsStyle="warning"> Reactants </Label></h4>
        <div> {table(rows(reactants, false))} </div>
        <h4><Label bsStyle="danger"> Products </Label></h4>
        <div> {table(rows(products, true))} </div>
      </div>
      : null
  )
}

const DescriptionContent = ({show, description}) => {
  return (
    show ?
      <div>
        <h4> Description </h4>
        <pre className="noBorder">{description}</pre>
      </div>
      : null
  )
}

const PurificationContent = ({show, purification}) => {
  return (
    show ?
      <div>
        <h4> Purification </h4>
        <pre className="noBorder">{purification.join(", ")}</pre>
      </div>
      : null
  )
}
const TLCContent = ({show, tlc_description, tlc_solvents, rf_value}) => {
  return (
    show ?
      <div>
        <h4> TLC - Control </h4>
        <pre className="noBorder">
          <p> <b>rf_value:</b> {rf_value} </p>
          <p> <b>TLC_solvents:</b> {tlc_solvents} </p>
          {tlc_description}
        </pre>
      </div>
      : null
  )
}

const ObservationContent = ({show, observation}) => {
  return (
    show ?
      <div>
        <h4> Observation </h4>
        <pre className="noBorder">{observation}</pre>
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
              <pre className="noBorder">
                <p><b>{product.molecule.sum_formular}</b> ({analysis.kind})</p>
                <pre className="noBorder">
                  <u>Content:</u> {analysis.content}
                  <u>Description:</u> {analysis.description}
                </pre>
              </pre>
            </div>
          : null
        )
      })
    )
  })
  return (
    show ?
      <div>
        <h4> Analysis </h4>
        <pre className="noBorder">{analyses}</pre>
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
        <h4> Literatures </h4>
        <div> {table} </div>
      </div>
      : null
  )
}

export {SVGContent, MaterialContent, DescriptionContent,
        PurificationContent, TLCContent, ObservationContent,
        AnalysesContent, LiteratureContent}
