import React from 'react';
import {
  Accordion, ButtonGroup, Button, OverlayTrigger, Tooltip, Popover
} from 'react-bootstrap';
import { uniq } from 'lodash';
import { Citation, literatureContent } from 'src/apps/mydb/elements/details/literature/LiteratureCommon';
import { CitationTypeEOL } from 'src/apps/mydb/elements/details/literature/CitationType';

const changeTypeBtn = (litype, updId, fn, typeMap, readOnly = false) => {
  const cands = Object.keys(typeMap).filter((e) => (e !== litype) && e !== 'uncategorized');
  const popover = (
    <Popover id="popover-positioned-scrolling-left" title="Move to">
      {
        cands.map((e) => (
          <Button
            disabled={readOnly}
            key={`btn_lit_${updId}`}
            size="sm"
            onClick={() => fn(updId, e)}
          >
            {typeMap[e].short}
          </Button>
        ))
      }
    </Popover>
  );

  return (
    <OverlayTrigger animation placement="top" rootClose trigger="click" overlay={popover}>
      <Button disabled={readOnly} size="sm"><i className="fa fa-pencil" aria-hidden="true" /></Button>
    </OverlayTrigger>
  );
};

const buildRow = (title, fnDelete, sortedIds, rows, fnUpdate, typeMap, readOnly = false) => {
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
          <OverlayTrigger
            placement="top"
            overlay={(
              <Tooltip id={`add-tip-${id}-${citation.id}`}>
                added by
                {citation.user_name}
              </Tooltip>
)}
          >
            <span style={{ color: '#337ab7' }}>
              {cnt}
              .&nbsp;
            </span>
          </OverlayTrigger>
          <Citation literature={citation} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ButtonGroup size="sm">
            <OverlayTrigger placement="top" overlay={<Tooltip id="assign_button">copy to clipboard</Tooltip>}>
              <Button
                active
                className="clipboardBtn"
                data-clipboard-text={content}
              >
                <i className="fa fa-clipboard" aria-hidden="true" />
              </Button>
            </OverlayTrigger>
            {changeTypeBtn(litype, id, fnUpdate, typeMap, readOnly)}
            <Button
              variant="danger"
              onClick={() => fnDelete(citation)}
              disabled={readOnly}
            >
              <i className="fa fa-trash-o" aria-hidden="true" />
            </Button>
          </ButtonGroup>
        </div>
      </div>
    );
  });
  result = result.filter((r) => r);
  return result;
};

function CitationPanel(props) {
  const {
    title, fnDelete, sortedIds, rows, fnUpdate, citationMap, typeMap, readOnly
  } = props;

  let result = buildRow(title, fnDelete, sortedIds, rows, fnUpdate, typeMap, readOnly);

  if (title === 'uncategorized' && result.length === 0) return null;

  result = (result.length > 0) ? result : <span>(No Data)</span>;
  return (
    <Accordion defaultActiveKey="0" className='mb-4'>
      <Accordion.Item eventKey="0">
        <Accordion.Header>
          &bull;&nbsp;
          {citationMap.def}
        </Accordion.Header>
        <Accordion.Body>
          {result}
        </Accordion.Body>
      </Accordion.Item>
    </Accordion>
  );
}

export default CitationPanel;
