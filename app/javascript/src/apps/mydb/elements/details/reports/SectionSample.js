import React from 'react';
import SVG from 'react-inlinesvg';
import { Card } from 'react-bootstrap';
import QuillViewer from 'src/components/QuillViewer'

// Fallback delta for an analysis whose extended_metadata has no content. Hoisted to a module
// constant so it isn't re-parsed for every analysis on every render. Never mutated (the map
// below returns new op objects), so a single shared instance is safe.
const DEFAULT_CONTENT = { ops: [{ insert: '' }] };

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
      // extended_metadata can be null for legacy rows (hstore column is nullable), so guard with `?.`.
      const contentJSON = a?.extended_metadata?.content || DEFAULT_CONTENT;
      const ops = Array.isArray(contentJSON.ops) ? contentJSON.ops : [];
      return [...sum, ...ops];
    }, init);
    // Return new op objects rather than mutating in place: with zero analyses `dataMerged` IS the
    // live reactionDescription.ops prop, and the spread copies the array but not its op objects,
    // so `d.insert = ...` would write into the sample's stored deltas during render.
    // A Quill embed op (e.g. an image) has a non-string `insert`; leave those intact (QuillViewer
    // strips embeds downstream) since only strings support .replace.
    const data = dataMerged.map(d => (
      typeof d.insert === 'string'
        ? { ...d, insert: d.insert.replace(/\n/g, ' ') }
        : d
    ));
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
