import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger, ButtonGroup, Dropdown, Button } from 'react-bootstrap';

import Utils from 'src/utilities/Functions';

function PrintCodeButton({
  element,
  analyses, allAnalyses, ident
}) {
  const { type, id } = element;
  let tooltipText = 'Print bar/qr-code Label';
  const ids = analyses.length > 0 ? analyses.map(e => e.id) : [];
  const contentsUri = analyses.length > 0
    ? `/api/v1/code_logs/print_analyses_codes?element_type=${type}&id=${id}&analyses_ids[]=${ids}`
    : `/api/v1/code_logs/print_codes?element_type=${type}&ids[]=${id}`;
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

  if (analyses.length > 0) { tooltipText = 'Print bar/qr-code Labels for this analysis'; }
  if (allAnalyses && analyses.length > 0) { tooltipText = 'Print bar/qr-code Labels for all analyses'; }

  return (
    <OverlayTrigger
      placement="top"
      delayShow={500}
      overlay={<Tooltip id="printCode">{tooltipText}</Tooltip>}
    >
      <Dropdown as={ButtonGroup}>
        <Button
          variant="light"
          id={`print-code-split-button-${ident || 0}`}
          disabled={element.isNew}
          onClick={(event) => {
            event.stopPropagation();
            Utils.downloadFile({ contents: menuItems[0].contents });
          }}
          size="xxsm"
        >
          <i className="fa fa-barcode fa-lg" />
        </Button>
        <Dropdown.Toggle split variant="light" size="xxsm" />
        <Dropdown.Menu>
          {menuItems.map((e) => (
            <Dropdown.Item
              key={e.key}
              onClick={(event) => {
                event.stopPropagation();
                Utils.downloadFile({ contents: e.contents });
              }}
            >
              {e.text}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown>
    </OverlayTrigger>
  );
}

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
