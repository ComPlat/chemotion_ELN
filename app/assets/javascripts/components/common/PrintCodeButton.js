import React from 'react';
import { Tooltip, OverlayTrigger, MenuItem, SplitButton,
   ButtonGroup} from 'react-bootstrap';

import Utils from '../utils/Functions';

const PrintCodeButton = ({element, analyses, all_analyses, ident})=>{
  let {type,id} = element
  let tooltip_text =  "Print bar/qr-code Label"
  let ids = analyses ?  analyses.map((e)=>e.id) : []
  let contents_uri = analyses
     ? `api/v1/code_logs/print_analyses_codes?element_type=${type}&id=${id}&analyses_ids[]=${ids}`
     : `api/v1/code_logs/print_codes?element_type=${type}&ids[]=${id}`
  let menuItems = [
      {
        key: 'smallCode',
        contents: `${contents_uri}&size=small`,
        text: 'Small Label',
      },
     {
       key: 'bigCode',
       contents: `${contents_uri}&size=big`,
       text: 'Large Label',
     },
   ]

  if (analyses) {
    tooltip_text = "Print bar/qr-code Labels for this analysis"
  }

  if (all_analyses && analyses) {
    tooltip_text = "Print bar/qr-code Labels for all analyses"
  }


  return (
    <OverlayTrigger placement="top"
      overlay={<Tooltip id="printCode">{tooltip_text}</Tooltip>}>
      <ButtonGroup className="button-right">
        <SplitButton id={`print-code-split-button-${ident ? ident : 0}`}
          pullRight bsStyle="default"
          disabled={element.isNew} bsSize="xsmall"
          onToggle={(is_open,event) => event.stopPropagation()}
          title={<i className="fa fa-barcode fa-lg"></i>}
          onClick={(event) =>  {event.stopPropagation();Utils.downloadFile(
              {contents: menuItems[0].contents})}}>
            {menuItems.map(e=>
              <MenuItem key={e.key}
                onSelect={(eventKey,event) => {event.stopPropagation();
                  Utils.downloadFile({contents: e.contents})}}>
                {e.text}
              </MenuItem>
            )}
        </SplitButton>
      </ButtonGroup>
    </OverlayTrigger>
  )
}

export default PrintCodeButton

PrintCodeButton.propTypes = {
  element: React.PropTypes.object,
  analyses: React.PropTypes.array,
  all_analyses: React.PropTypes.bool,
}
