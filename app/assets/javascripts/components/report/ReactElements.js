import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Label, Table} from 'react-bootstrap';

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
        <tr key={i}>
          <td>{sample.molecule.iupac_name}
              <br/>
              {sample.molecule.sum_formular}
              </td>
          <td>{materailCalc(sample.amount_g, 1000, 4)}</td>
          <td>{materailCalc(sample.amount_l, 1000, 4)}</td>
          <td>{materailCalc(sample.amount_mol, 1000, 4)}</td>
          <td>{materailCalc(sample.equivalent, 1, 4)}</td>
        </tr>
      )
    })
  }
  const table = (rows) => {
    return (
      <Table striped condensed hover>
        <thead>
          <tr>
            <th>Name</th>
            <th>Mass(mg)</th>
            <th>Vol(ml)</th>
            <th>Amount(mmol)</th>
            <th>Equiv/Yield</th>
          </tr>
        </thead>
        <tbody>
          {rows}
        </tbody>
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

const PropertyContent = ({show, observation, purification, dangerous_products}) => {
  const list = (items) => {
    return  (
      items.length > 0 ?
        items.map( (item, i) => { return <p key={i}>{i+1}. {item}</p> })
        : null
    )
  }
  const table = <Table condensed bordered>
                  <tbody>
                    <tr>
                      <td><h5>Observation</h5></td>
                      <td>{observation}</td>
                    </tr>
                    <tr>
                      <td><h5>Purification</h5></td>
                      <td>{list(purification)}</td>
                    </tr>
                    <tr>
                      <td><h5>Dangerous<br/>products</h5></td>
                      <td>{list(dangerous_products)}</td>
                    </tr>
                  </tbody>
                </Table>
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> Properties </Label></h4>
        <div> {table} </div>
      </div>
      : null
  )
}

const TLCContent = ({show, tlc_description}) => {
  return (
    show ?
      <div>
        <h4><Label bsStyle="default"> TLC - Control </Label></h4>
        <div> {tlc_description} </div>
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

export {DescriptionContent, SVGContent, MaterialContent, PropertyContent, TLCContent, LiteratureContent}
