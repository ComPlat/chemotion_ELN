import React from 'react';
import { Panel, ButtonGroup, Button, OverlayTrigger, Tooltip, Popover } from 'react-bootstrap';
import { uniq } from 'lodash';
import { Citation, literatureContent } from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import { CitationType, CitationTypeMap, CitationTypeEOL } from 'src/apps/mydb/elements/details/literature/CitationType';

const changeTypeBtn = (litype, updId, fn) => {
  const cands = CitationType.filter(e => e !== litype);
  const popover = (
    <Popover id="popover-positioned-scrolling-left" title="Move to">
      {
        cands.map(e => <Button key={`btn_lit_${updId}`} bsSize="xsmall" onClick={() => fn(updId, e)}>{CitationTypeMap[e].short}</Button>)
      }
    </Popover>
  );

  return (
    <OverlayTrigger animation placement="top" rootClose trigger="click" overlay={popover}>
      <Button bsSize="sm" ><i className="fa fa-pencil" aria-hidden="true" /></Button>
    </OverlayTrigger>
  );
};

const buildRow = (title, fnDelete, sortedIds, rows, fnUpdate) => {
  const unis = uniq(sortedIds);
  let cnt = 0;
  let result = unis.map((id) => {
    const citation = rows.get(id);
    let { litype } = citation;
    if (typeof litype === 'undefined' || CitationTypeEOL.includes(litype)) {
      litype = 'uncategorized';
    }
    if (litype !== title) {
      return null;
    }
    const content = literatureContent(citation, true);
    cnt += 1;
    return (
      <div key={`row-${id}-${citation.id}`} style={{ display: 'flex', flexWrap: 'wrap', paddingBottom: '5px' }}>
        <div style={{ flexBasis: '86%', display: 'flex' }}>
          <OverlayTrigger placement="top" overlay={<Tooltip id={`add-tip-${id}-${citation.id}`}>added by {citation.user_name}</Tooltip>}>
            <span style={{ color: '#337ab7' }}>{cnt}.&nbsp;</span>
          </OverlayTrigger>
          <Citation literature={citation} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ButtonGroup bsSize="small">
            <OverlayTrigger placement="top" overlay={<Tooltip id="assign_button">copy to clipboard</Tooltip>}>
              <Button active className="clipboardBtn" data-clipboard-text={content} >
                <i className="fa fa-clipboard" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
            {changeTypeBtn(litype, id, fnUpdate)}
            <Button bsStyle="danger" onClick={() => fnDelete(citation)} ><i className="fa fa-trash-o" aria-hidden="true" /></Button>
          </ButtonGroup>
        </div>
      </div>
    );
  });
  result = result.filter(r => r);
  return result;
};

const CitationPanel = (props) => {
  const {
    title, fnDelete, sortedIds, rows, fnUpdate
  } = props;
  let result = buildRow(title, fnDelete, sortedIds, rows, fnUpdate);
  if (title === 'uncategorized' && result.length === 0) return null;
  result = (result.length > 0) ? result : <span>(No Data)</span>;
  return (
    <Panel id={`_citation_panel_${title}`} defaultExpanded className="panel-cite">
      <Panel.Heading>
        <Panel.Title toggle>
          &bull;&nbsp;{CitationTypeMap[title].def}
        </Panel.Title>
      </Panel.Heading>
      <Panel.Collapse>
        <Panel.Body>
          {result}
        </Panel.Body>
      </Panel.Collapse>
    </Panel>
  );
};

export default CitationPanel;
