import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Label, Table, Tooltip, OverlayTrigger} from 'react-bootstrap';

const SVGContent = ({show, reaction_svg_file}) => {
  const svg_file =reaction_svg_file && `/images/reactions/${reaction_svg_file}`
  return (
    show
      ? <div>
          <SVG key={svg_file} src={svg_file} className='reaction-details'/>
        </div>
      : null
  )
}

const StatusContent = ({status}) => {
  let tooltip = null;
  switch(status) {
    case "Successful":
      tooltip = (<Tooltip id="reaction_success">Successful Reaction</Tooltip>);
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <a style={{marginLeft: '10px',
                   padding: '3px',
                   backgroundColor: 'white',
                   color:'green'}} >
            <i className="fa fa-check-circle-o"/>
          </a>
        </OverlayTrigger>
      )
      break;
    case "Planned":
      tooltip = (<Tooltip id="reaction_planned">Planned Reaction</Tooltip>);
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
        <a style={{marginLeft: '10px',
                   padding: '3px',
                   backgroundColor: 'white',
                   color:'orange'}} >
          <i className="fa fa-clock-o"/>
        </a>
        </OverlayTrigger>
      )
      break;
    case "Not Successful":
      tooltip = (<Tooltip id="reaction_fail">Not Successful Reaction</Tooltip>);
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
        <a style={{marginLeft: '10px',
                   padding: '3px',
                   backgroundColor: 'white',
                   color:'red'}} >
          <i className="fa fa-times-circle-o"/>
        </a>
        </OverlayTrigger>
      )
      break;
    default:
      return null;
  }
}

const MaterialContent = ({show, starting_materials, reactants, products}) => {
  const materialCalc = (target, multi, precision) => {
    return (target ? (target*multi).toFixed(precision) : " - ")
  }

  const equiv_or_yield = (s, isProduct) => {
    return (
      isProduct
        ? materialCalc(s.equivalent*100, 1, 0).toString() + "%"
        : materialCalc(s.equivalent, 1, 3)
    )
  }

  const rows = (material, isProduct) => {
    return (
      typeof material != 'undefined'
        ? material.map((sample, i) => {
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
                <td style={{width: '20%'}}>{materialCalc(sample.amount_g, 1000, 3)}</td>
                <td style={{width: '20%'}}>{materialCalc(sample.amount_l, 1000, 3)}</td>
                <td style={{width: '20%'}}>{materialCalc(sample.amount_mol, 1000, 3)}</td>
                <td style={{width: '20%'}}>{equiv_or_yield(sample, isProduct)}</td>
              </tr>
            </tbody>
          )})
        : null
    )
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
    show
      ? <div>
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

const SolventContent = ({show, solvents, solvent}) => {
  const volume = (s) => {
    if(s.real_amount_value) {
      return " (" + s.real_amount_value + "ml)"
    } else if(s.target_amount_value) {
      return " (" + s.target_amount_value + "ml)"
    } else {
      return " (0.0ml)"
    }
  }

  const solventsData = () => {
    return solvents.map( (s, i) => {
      return (
        <div key={i}>
          <pre className="noBorder">{
            s.preferred_label + volume(s)
          }</pre>
        </div>
      )
    })
  }

  const solventData = () => {
    return (
      <div>
        <pre className="noBorder">{solvent}</pre>
      </div>
    )
  }

  const displayContent = () => {
    return (
      solvents.length !== 0 ? solventsData() : solventData()
    )
  }

  return (
    show
      ? <div>
          <h4> Solvent </h4>
          <div>{displayContent()}</div>
        </div>
      : null
  )
}

const DescriptionContent = ({show, description}) => {
  return (
    show
      ? <div>
          <h4> Description </h4>
          <pre className="noBorder">{description}</pre>
        </div>
      : null
  )
}

const PurificationContent = ({show, purification}) => {
  return (
    show
      ? <div>
          <h4> Purification </h4>
          <pre className="noBorder">{purification.join(", ")}</pre>
        </div>
      : null
  )
}
const TLCContent = ({show, tlc_description, tlc_solvents, rf_value}) => {
  return (
    show
      ? <div>
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
    show
      ? <div>
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
          analysis
            ? <div key={i*100+j}>
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
    show
      ? <div>
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
    show
      ? <div>
          <h4> Literatures </h4>
          <div> {table} </div>
        </div>
      : null
  )
}

export {SVGContent, MaterialContent, DescriptionContent,
        PurificationContent, TLCContent, ObservationContent,
        AnalysesContent, LiteratureContent, SolventContent,
        StatusContent}
