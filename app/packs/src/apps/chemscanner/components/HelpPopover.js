import React from 'react';
import { Popover } from 'react-bootstrap';

const HelpPopover = props => (
  <Popover id="popover-positioned-bottom" title="How to Use" {...props}>
    <strong>Scan File</strong>
    <p>
      Retrieve reaction(s)/molecule(s) from file(s).
      Current support file types: CDX, CDXML, DOC, DOCX, ZIP.
    </p>
    <strong>Clean Up</strong>
    <p>
      Clean up molecule(s) structure.
      All structures will be cleaned up if no molecule(s)/reaction(s) are selected.
    </p>
    <strong>Add solvents/reagents</strong>
    <p>
      Solvents/Reagents from the list will be added to the selected reaction(s).
    </p>
    <strong>Abbreviation Management</strong>
    <p>
      Management UI for abbreviations and superatoms
    </p>
    <strong>Export</strong>
    <p>
      Export selected elements to CML or Excel.
      All elements will be exported if none are selected.
    </p>
  </Popover>
);

export default HelpPopover;
