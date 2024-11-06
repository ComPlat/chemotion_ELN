import React from 'react';
import SVG from 'react-inlinesvg';
import { Card } from 'react-bootstrap';
import QuillViewer from 'src/components/QuillViewer'

const SectionSample = ({ sample, settings, configs }) => {
  const { short_label, molecule_iupac_name, svgPath, analyses,
    reaction_description, name, external_label } = sample;

  return (
    <div>
      <Card bg="dark" text="white" className="mb-3">
        <Card.Header className="text-center">
          {`${molecule_iupac_name} (${name || external_label || short_label})`}
        </Card.Header>
      </Card>

      <SVGContent
        show={settings.diagram}
        svgPath={svgPath}
      />

      <AnalysesContent
        show={settings.analyses && analyses}
        showRecDes={settings.reactiondesc && reaction_description}
        analyses={analyses}
        reactionDescription={reaction_description}
      />
    </div>
  );
};

const SVGContent = ({ show, svgPath }) => {
  if (!show) { return null; }
  return <SVG key={svgPath} src={svgPath} className='sample-details' />
}

const AnalysesContent = ({ show, showRecDes, analyses, reactionDescription }) => {
  const isReDesObj = typeof reactionDescription === "object";
  const init = showRecDes && isReDesObj ? reactionDescription.ops : [];
  const analysesParagraph = () => {
    const dataMerged = analyses.reduce((sum, a) => {
      let defaultContent = "{\"ops\":[{\"insert\":\"\"}]}"

      let contentJSON = a.extended_metadata.content || JSON.parse(defaultContent)
      return [...sum, ...contentJSON.ops];
    }, init);
    const data = dataMerged.map(d => {
      d.insert = d.insert.replace(/\n/g, ' ');
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
