import React from 'react';
import { Table, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { UserSerial } from '../utils/ReportHelper';

const rlRowTp = (content, rowId) => (
  <Tooltip id={rowId}>
    <p>{ content }</p>
  </Tooltip>
);

const rlRowCont = (content, rowId) => {
  const overlay = rlRowTp(content, rowId);
  return (
    <OverlayTrigger placement="top" overlay={overlay}>
      <p>{ content ? content.substring(0, 15) : '' }</p>
    </OverlayTrigger>
  );
};

const tableHeader = () => (
  <thead>
    <tr>
      <th>Label</th>
      <th>Image*</th>
      <th>Name</th>
      <th>InChI</th>
      <th>InChIKey</th>
      <th>Long-RInChIKey</th>
      <th>Web-RInChIKey</th>
      <th>Short-RInChIKey</th>
    </tr>
  </thead>
);

const rowContent = (p, long, short, web, molSerials, idx) => (
  <tr>
    <td className="one-line" >{UserSerial(p.molecule, molSerials)}</td>
    <td className="one-line" >{}</td>
    <td className="one-line" >{rlRowCont(p.showedName())}</td>
    <td className="one-line" >{rlRowCont(p.molecule.inchikey)}</td>
    <td className="one-line" >{rlRowCont(p.molecule.inchistring)}</td>
    <td className="one-line" >{rlRowCont(long, idx)}</td>
    <td className="one-line" >{rlRowCont(short, idx)}</td>
    <td className="one-line" >{rlRowCont(web, idx)}</td>
  </tr>
);

const tableBody = (objs, molSerials) => {
  const contents = objs.map((r, idx) => {
    if (r.type === 'reaction' && r.role !== 'gp') {
      const long = r.rinchi_long_key;
      const short = r.rinchi_short_key;
      const web = r.rinchi_web_key;
      return (
        r.products.map(p => rowContent(p, long, short, web, molSerials, idx))
      );
    }
    return null;
  }).filter(r => r !== null);

  return (
    <tbody>{ contents }</tbody>
  );
};

const SectionReactionList = ({ objs, molSerials }) => (
  <div>
    <p>* Images are hidden in the preview.</p>
    <Table striped bordered condensed hover>
      { tableHeader() }
      { tableBody(objs, molSerials) }
    </Table>
  </div>
);

export default SectionReactionList;
