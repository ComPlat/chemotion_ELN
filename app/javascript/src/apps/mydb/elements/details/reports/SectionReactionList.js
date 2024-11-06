import React from 'react';
import { Table, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { UserSerial } from 'src/utilities/ReportHelper';

const rlRowCont = (content) => (
  <OverlayTrigger
    placement="top"
    overlay={(
      <Tooltip>
        {content}
      </Tooltip>
    )}
  >
    <p>{content ? content.substring(0, 15) : ''}</p>
  </OverlayTrigger>
);

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

const rowContent = (r, p, molSerials) => (
  <tr key={`r${r.id}-p${p.id}`}>
    <td className="text-nowrap">{UserSerial(p.molecule, molSerials)}</td>
    <td className="text-nowrap" />
    <td className="text-nowrap">{rlRowCont(p.showedName())}</td>
    <td className="text-nowrap">{rlRowCont(p.molecule.inchikey)}</td>
    <td className="text-nowrap">{rlRowCont(p.molecule.inchistring)}</td>
    <td className="text-nowrap">{rlRowCont(r.rinchi_long_key)}</td>
    <td className="text-nowrap">{rlRowCont(r.rinchi_short_key)}</td>
    <td className="text-nowrap">{rlRowCont(r.rinchi_web_key)}</td>
  </tr>
);

const tableBody = (objs, molSerials) => {
  const contents = objs
    .filter((r) => (r.type === 'reaction' && r.role !== 'gp'))
    .flatMap((r) => (
      r.products.map((p) => (
        rowContent(r, p, molSerials)
      ))
    ));

  return (
    <tbody>{contents}</tbody>
  );
};

const SectionReactionList = ({ objs, molSerials }) => (
  <div>
    <p>* Images are hidden in the preview.</p>
    <Table striped bordered hover responsive>
      {tableHeader()}
      {tableBody(objs, molSerials)}
    </Table>
  </div>
);

export default SectionReactionList;
