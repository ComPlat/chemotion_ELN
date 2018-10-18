import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Alert, Label, Table, Tooltip, OverlayTrigger} from 'react-bootstrap';
import QuillViewer from '../QuillViewer'

const SectionReaction = ({reaction, settings, configs}) => {
  const {description, literatures, starting_materials, reactants,
         products, solvents, solvent, dangerous_products, purification,
         observation, svgPath, tlc_description,
         tlc_solvents, rf_value, status } = reaction;
  const dangerousProducts = dangerous_products;

  const has_analyses = products.map( sample => {
    if(sample.analyses.length != 0) {
      return true;
    }
  }).filter(r => r!=null).length != 0;

  const showPuri = settings.purification
    && purification
    && purification.length !== 0;

  const showDang = settings.dangerouspro
    && dangerousProducts
    && dangerousProducts.length !== 0;

  return (
    <div>
      <Alert style={{ textAlign: 'center',
                      backgroundColor: '#428bca',
                      color:'white',
                      border:'none'}}> {reaction.short_label}
        <StatusContent status={status}/>
      </Alert>

      <SVGContent show={settings.diagram}
                  svgPath={svgPath}
                  isProductOnly={!configs.Showallchemi}
                  products={products} />
      <MaterialContent  show={settings.material}
                        starting_materials={starting_materials}
                        reactants={reactants}
                        products={products} />
      <SolventContent show={settings.material}
                      solvents={solvents}
                      solvent={solvent} />
      <h4> Description </h4>
      <DescriptionContent show={settings.description && description}
                          description={description} />
      <PurificationContent
        show={showPuri}
        puri={purification}
      />
      <br />
      <DangerourProductsContent
        show={showDang}
        dang={dangerousProducts}
      />
      <br />
      <TLCContent
        show={settings.tlc && tlc_description}
        tlcDescription={tlc_description}
        tlcSolvents={tlc_solvents}
        rfValue={rf_value}
      />
      <ObservationContent show={settings.observation && observation}
                          observation={observation} />
      <AnalysesContent show={settings.analysis && has_analyses}
                       products={products} />
      <LiteratureContent show={settings.literature && literatures && literatures.length != 0}
                         literatures={literatures} />
    </div>
  )
}

const SVGContent = ({show, svgPath, products, isProductOnly}) => {
  const productsSvg = products.map(s => {
    const svg = s.svgPath;
    return (<td key={s.id}><SVG src={svg}/></td>);
  });

  if(!show) {
    return null;
  }

  return (
    isProductOnly
      ? <Table className='reaction-details'>
          <tbody>
            <tr>
              { productsSvg }
            </tr>
          </tbody>
        </Table>
      : <SVG key={svgPath} src={svgPath} className='reaction-details'/>
  )
}

const StatusContent = ({ status }) => {
  let tooltip = null;
  switch(status) {
    case "Successful":
      tooltip = (<Tooltip id="reaction_success">Successful Reaction</Tooltip>);
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <a style={{ marginLeft: '10px', padding: '3px', color: 'white' }} >
            <i className="fa fa-check-circle" />
          </a>
        </OverlayTrigger>
      );
    case "Planned":
      tooltip = (<Tooltip id="reaction_planned">Planned Reaction</Tooltip>);
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <a style={{ marginLeft: '10px', padding: '3px', backgroundColor: 'white', color: 'orange' }} >
            <i className="fa fa-clock-o" />
          </a>
        </OverlayTrigger>
      );
    case "Not Successful":
      tooltip = (<Tooltip id="reaction_fail">Not Successful Reaction</Tooltip>);
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <a style={{ marginLeft: '10px', padding: '3px', backgroundColor: 'white', color: 'red' }} >
            <i className="fa fa-times-circle-o" />
          </a>
        </OverlayTrigger>
      );
    case "General Procedure":
      tooltip = (<Tooltip id="general_procedure">General Procedure</Tooltip>);
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <a style={{ marginLeft: '10px', padding: '3px', backgroundColor: 'white', color: 'blue' }} >
            <i className="fa fa-home" />
          </a>
        </OverlayTrigger>
      );
    default:
      return null;
  }
};

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
                  {sample.molecule_iupac_name}
                  ({sample.short_label})
                </td>
              </tr>
              <tr>
                <td style={{width: '20%'}}>{sample.molecule.sum_formular}</td>
                <td style={{width: '20%'}}>{materialCalc(sample.amount_g, 1, 3)}</td>
                <td style={{width: '20%'}}>{materialCalc(sample.amount_l, 1000, 3)}</td>
                <td style={{width: '20%'}}>{materialCalc(sample.amount_mol, 1000, 3)}</td>
                <td style={{width: '20%'}}>{equiv_or_yield(sample, isProduct)}</td>
              </tr>
            </tbody>
          )})
        : null
    )
  }
  const table = (dataRows) => (
    <Table striped condensed hover>
      <thead>
        <tr>
          <th>Formula</th>
          <th>Mass(g)</th>
          <th>Vol(ml)</th>
          <th>Amount(mmol)</th>
          <th>Equiv/Yield</th>
        </tr>
      </thead>
      {dataRows}
    </Table>
  );

  return (
    show
      ? <div>
          <h4><Label bsStyle="success"> Starting Materials </Label></h4>
          <div> {table(rows(starting_materials, false))} </div>
          <h4><Label bsStyle="warning"> Reactants </Label></h4>
          <div> {table(rows(reactants, false))} </div>
          <h4><Label bsStyle="danger"> Products </Label></h4>
          <div> {table(rows(products, true))} </div>
        </div>
      : null
  )
}

const SolventContent = ({ show, solvents, solvent }) => {
  const volume = (s) => {
    if (s.amount_l) {
      return `(${s.amount_l * 1000}ml)`;
    }
    return '(0.0ml)';
  };

  const separator = (idx, last) => (
    idx === last ? '' : ', '
  );

  const solventsData = () => {
    const last = solvents.length - 1;
    return solvents.map((s, i) => (
      <pre key={i} className="noBorder display-inline no-padding">
        {s.preferred_label + volume(s) + separator(i, last)}
      </pre>
    ));
  };

  const solventData = () => (
    <pre className="noBorder display-inline no-padding">{solvent}</pre>
  );

  const displayContent = () => (
    solvents.length !== 0 ? solventsData() : solventData()
  );

  return (
    show
      ? <div>
          <h4 className="display-inline"> Solvent(s): </h4>
          {displayContent()}
        </div>
      : null
  );
};

const DescriptionContent = ({show, description}) => {
  return show ? <QuillViewer value={description} /> : null;
}

const PurificationContent = ({ show, puri }) => {
  const puriText = typeof puri === 'object' ? puri.join(', ') : puri;
  return (
    show
      ? <div>
          <h4 className="display-inline"> Type of Purification: </h4>
          <pre className="noBorder display-inline no-padding">
            {puriText}
          </pre>
        </div>
      : null
  );
};

const DangerourProductsContent = ({ show, dang }) => {
  const dangText = typeof dang === 'object' ? dang.join(', ') : dang;
  return (
    show
      ? <div>
          <h4 className="display-inline"> Dangerous Products: </h4>
          <pre className="noBorder display-inline no-padding">{dangText}</pre>
        </div>
      : null
  );
};

const TLCContent = ({show, tlcDescription, tlcSolvents, rfValue}) => (
  show
    ? <div>
        <div>
        <h4 className="display-inline"> TLC - Control </h4>
          <pre className="noBorder display-inline no-padding">
            Rf-value: {rfValue} (Solvent: {tlcSolvents})
          </pre>
        </div>
        <div className="g-marginLeft--10">
          {tlcDescription}
        </div>
      </div>
    : null
);

const ObservationContent = ({show, observation}) => {
  return (
    show
      ? <div>
          <h4> Observation </h4>
          <QuillViewer value={observation} />
        </div>
      : null
  )
}

const AnalysesContent = ({ show, products }) => {
  const analyses = products.map((product, i) => (
    product.analyses.map((analysis, j) => {
      const content = analysis && analysis.extended_metadata
        ? JSON.parse(analysis.extended_metadata.content)
        : {};
      const kind = analysis.kind ? `(${analysis.kind})` : '';
      return (
        analysis
          ? <div key={i * 100 + j}>
              <div className="noBorder g-marginLeft--20">
                <p><u>{product.molecule.sum_formular}</u> ({kind})</p>
                <div className="noBorder g-marginLeft--20">
                  <QuillViewer value={content} />
                  <p className="g-marginLeft--20">{analysis.description}</p>
                </div>
              </div>
              <br/>
            </div>
          : null
      );
    })
  ));
  return (
    show
      ? <div>
          <h4> Analysis </h4>
          <div className="noBorder">{analyses}</div>
        </div>
      : null
  );
};

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

export { SectionReaction, SVGContent, DescriptionContent };
