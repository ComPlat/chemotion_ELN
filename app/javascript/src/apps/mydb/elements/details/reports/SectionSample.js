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
  const isReDesObj = typeof reactionDescription === 'object';
  const reDesOps = showRecDes && isReDesObj ? reactionDescription.ops : null;
  const init = Array.isArray(reDesOps) ? reDesOps : [];
  const analysesParagraph = () => {
    const dataMerged = analyses.reduce((sum, a) => {
      const defaultContent = "{\"ops\":[{\"insert\":\"\"}]}";

      // extended_metadata can be null for legacy rows (hstore column is nullable), so guard with `?.`.
      const contentJSON = a?.extended_metadata?.content || JSON.parse(defaultContent);
      const ops = Array.isArray(contentJSON.ops) ? contentJSON.ops : [];
      return [...sum, ...ops];
    }, init);
    const data = dataMerged.map(d => {
      // A Quill embed op (e.g. an image) has a non-string `insert` object; only strings
      // support .replace. QuillViewer strips embeds downstream, so just leave them intact here.
      if (typeof d.insert === 'string') {
        d.insert = d.insert.replace(/\n/g, ' ');
      }
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
};

export default SectionSample;
export { AnalysesContent };
