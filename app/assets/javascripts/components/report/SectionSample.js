import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Alert, Label, Table, Tooltip, OverlayTrigger} from 'react-bootstrap';
import QuillViewer from '../QuillViewer'

const SectionSample = ({sample, settings, configs}) => {
  const { short_label, molecule_iupac_name, svgPath, analyses } = sample;

  return (
    <div>
      <Alert style={{ textAlign: 'center',
                      backgroundColor: '#000000',
                      color:'white',
                      border:'none'}}> {`${molecule_iupac_name} (${short_label})`}
      </Alert>

      <SVGContent show={settings.diagram}
                  svgPath={svgPath} />

      <AnalysesContent showDesc={settings.analysesdesc}
                        showCont={settings.analysescont}
                        analyses={analyses} />

    </div>
  )
}

const SVGContent = ({show, svgPath}) => {
  if(!show) { return null; }
  return  <SVG key={svgPath} src={svgPath} className='sample-details'/>
}

const AnalysesContent = ({showDesc, showCont, analyses}) => {
  const content = (content) => {
    return(
      showCont
        ? <QuillViewer value={content} />
        : null
    );
  }

  const description = (description) => {
    return(
      showDesc
        ? <div className="noBorder like-quill-viewer">{description}</div>
        : null
    );
  }

  const analysis = (analysis, i) => {
    return(
      analysis.report
        ? <div key={i}>
            {content(analysis.content)}
            {description(analysis.description)}
          </div>
        : null
    );
  }

  return (
    showDesc || showCont
      ? <div>
          <h4> Analyses </h4>
          <div>{analyses.map( (a, i) => analysis(a, i))}</div>
        </div>
      : null
  );
}

export default SectionSample;
