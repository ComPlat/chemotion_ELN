import React, {Component} from 'react'
import SVG from 'react-inlinesvg';
import {Alert, Label, Table, Tooltip, OverlayTrigger} from 'react-bootstrap';
import QuillViewer from '../QuillViewer'

const SectionSample = ({sample, settings, configs}) => {
  const { short_label, molecule_iupac_name, svgPath, analyses,
          reaction_description } = sample;

  return (
    <div>
      <Alert style={{ textAlign: 'center',
                      backgroundColor: '#000000',
                      color:'white',
                      border:'none'}}> {`${molecule_iupac_name} (${short_label})`}
      </Alert>

      <SVGContent show={settings.diagram}
                  svgPath={svgPath} />

      <AnalysesContent show={settings.analyses && analyses}
                        showRecDes={settings.reactiondesc && reaction_description}
                        analyses={analyses}
                        reactionDescription={reaction_description} />

    </div>
  )
}

const SVGContent = ({show, svgPath}) => {
  if(!show) { return null; }
  return  <SVG key={svgPath} src={svgPath} className='sample-details'/>
}

const AnalysesContent = ({show, showRecDes, analyses, reactionDescription}) => {
  const isReDesObj = typeof reactionDescription === "object";
  const init = showRecDes && isReDesObj ? reactionDescription.ops : [];
  const analysesParagraph = () => {
    const dataMerged = analyses.reduce( (sum, a) => {
      let contentJSON = JSON.parse(a.extended_metadata.content)
      return [...sum, ...contentJSON.ops];
    } , init);
    const data = dataMerged.map(d => {
      d.insert = d.insert.replace(/\n/g,' ');
      return d;
    });
    return { ops: data };
  };

  return (
    show
      ? <div>
          {<QuillViewer value={analysesParagraph()} />}
        </div>
      : null
  );
}

export default SectionSample;
