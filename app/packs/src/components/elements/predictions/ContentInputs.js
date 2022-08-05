import React from 'react';
import SVG from 'react-inlinesvg';
import { Panel } from 'react-bootstrap';

const styles = {
  svgContainer: {
    height: 200,
    overflowX: 'scroll',
    overflowY: 'auto',
    whiteSpace: 'nowrap',
  },
  svgBox: {
    display: 'inline-block',
    height: 100,
    margin: 5,
    width: 200,
  },
  svgTxt: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: 180,
  },
  emptyBox: {
    marginTop: 60,
  },
};

const contentBlock = (els) => {
  if (!els || els.length === 0) {
    return (
      <div style={styles.emptyBox}>
        <h3> Please select samples. </h3>
      </div>
    );
  }

  return (
    els.map(el => (
      <div key={el.svgPath} style={styles.svgBox}>
        <SVG src={el.svgPath} />
        <p style={styles.svgTxt}>{ el.molecule_iupac_name }</p>
        <p style={styles.svgTxt}>{ el.molecule_cano_smiles }</p>
      </div>
    ))
  );
};

const ContentInputs = (template, els) => {
  const titleFromTemplate = (tpl) => ({
    'predictProducts': 'Input: Starting Materials (accept max 10 molecules)',
    'predictReactants': 'Input: Product (accept max 1 molecule)',
  })[tpl]
  const titleStr = titleFromTemplate(template) || 'TBD';

  return (
    <Panel bsStyle="default" defaultExpanded>
      <Panel.Heading>
        <Panel.Title toggle>
          { titleStr }
        </Panel.Title>
      </Panel.Heading>
      <Panel.Collapse>
        <Panel.Body>
          <div className="svg" style={styles.svgContainer}>
            { contentBlock(els) }
          </div>
        </Panel.Body>
      </Panel.Collapse>
    </Panel>
  );
};

export default ContentInputs;
