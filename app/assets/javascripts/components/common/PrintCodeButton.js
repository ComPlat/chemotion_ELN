import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger, MenuItem, SplitButton, ButtonGroup } from 'react-bootstrap';

import Utils from '../utils/Functions';

const PrintCodeButton = ({
  element,
  analyses, allAnalyses, ident
}) => {
  const { type, id } = element;
  let tooltipText = 'Print bar/qr-code Label';
  const ids = analyses ? analyses.map(e => e.id) : [];
  const contentsUri = analyses
    ? `api/v1/code_logs/print_analyses_codes?element_type=${type}&id=${id}&analyses_ids[]=${ids}`
    : `api/v1/code_logs/print_codes?element_type=${type}&ids[]=${id}`;
  const menuItems = [
    {
      key: 'smallCode',
      contents: `${contentsUri}&size=small`,
      text: 'Small Label',
    },
    {
      key: 'bigCode',
      contents: `${contentsUri}&size=big`,
      text: 'Large Label',
    },
  ];

  if (analyses) { tooltipText = 'Print bar/qr-code Labels for this analysis'; }
  if (allAnalyses && analyses) { tooltipText = 'Print bar/qr-code Labels for all analyses'; }

  return (
    <OverlayTrigger
      placement="top"
      delayShow={500}
      overlay={<Tooltip id="printCode">{tooltipText}</Tooltip>}
    >
      <ButtonGroup className="button-right">
        <SplitButton
          id={`print-code-split-button-${ident || 0}`}
          pullRight
          bsStyle="default"
          disabled={element.isNew}
          bsSize="xsmall"
          onToggle={(isOpen, event) => { if (event) { event.stopPropagation(); } }}
          title={<i className="fa fa-barcode fa-lg" />}
          onClick={(event) => {
            event.stopPropagation();
            Utils.downloadFile({ contents: menuItems[0].contents });
          }}
        >
          {menuItems.map(e => (
            <MenuItem
              key={e.key}
              onSelect={(eventKey, event) => {
                event.stopPropagation();
                Utils.downloadFile({ contents: e.contents });
              }}
            >
              {e.text}
            </MenuItem>
          ))}
        </SplitButton>
      </ButtonGroup>
    </OverlayTrigger>
  );
};

PrintCodeButton.propTypes = {
  element: PropTypes.object,
  analyses: PropTypes.array,
  allAnalyses: PropTypes.bool,
  ident: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
  ])
};

PrintCodeButton.defaultProps = {
  // element: ,
  analyses: [],
  allAnalyses: false,
  ident: 0
};

export default PrintCodeButton;
