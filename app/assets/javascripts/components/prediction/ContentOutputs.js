import React from 'react';
import SvgFileZoomPan from 'react-svg-file-zoom-pan';
import { Panel } from 'react-bootstrap';

const styles = {
  container: {
  },
};

const stripBStyle = idx => (idx % 2 === 0 ? 'primary' : 'info');

const contentBlock = els => (
  els.map((el, idx) => (
    <div key={`${idx}-${el.id}`}>
      <Panel bsStyle={stripBStyle(idx)}>
        <Panel.Heading>
          <Panel.Title>
            Rank { el.rank }: { el.smiles.join('.') }
          </Panel.Title>
        </Panel.Heading>
        <SvgFileZoomPan
          svg={el.svg}
          duration={300}
          resize
        />
      </Panel>
    </div>
  ))
);

const ContentOutputs = (template, outputEls) => {
  const titleStr = template === 'predictProd'
    ? 'Output: Products'
    : 'TBD';

  return (
    <Panel bsStyle="default" defaultExpanded>
      <Panel.Heading>
        <Panel.Title toggle>
          { titleStr }
        </Panel.Title>
      </Panel.Heading>
      <Panel.Collapse>
        <Panel.Body>
          <div style={styles.container}>
            { contentBlock(outputEls) }
          </div>
        </Panel.Body>
      </Panel.Collapse>
    </Panel>
  );
};

export default ContentOutputs;
