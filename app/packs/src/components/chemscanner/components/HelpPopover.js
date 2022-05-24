import React from 'react';
import { Popover } from 'react-bootstrap';

const HelpPopover = props => (
  <Popover id="chemscanner-help-popover" title="How to Use" {...props} >
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
    <strong>Export</strong>
    <p>
      Export selected elements to CML or Excel.
      All elements will be exported if none are selected.
    </p>
    <strong>Add solvents/reagents <i><b>(Only for logged-in users)</b></i></strong>
    <p>
      Solvents/Reagents from the list will be added to the selected reaction(s).
    </p>
    <strong>View</strong>
    <p>
      Switching View between abbreviations/superatoms management,
      uploaded file storage management and scanned elements.
    </p>
    <ul>
      <li><b>Scanned Files:</b> View scanned molecules/reactions</li>
      <li>
        <b>Abbreviation/Superatom:</b> Abbreviations and superatoms management.
        <b> Only logged-in users can edit</b>
      </li>
      <li>
        <b>File Storage:</b> Uploaded files, scanned files management.
        <b> Only for logged-in users</b>
      </li>
    </ul>
  </Popover>
);

export default HelpPopover;
