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
    <td className="one-line">{UserSerial(p.molecule, molSerials)}</td>
    <td className="one-line" />
    <td className="one-line">{rlRowCont(p.showedName())}</td>
    <td className="one-line">{rlRowCont(p.molecule.inchikey)}</td>
    <td className="one-line">{rlRowCont(p.molecule.inchistring)}</td>
    <td className="one-line">{rlRowCont(r.rinchi_long_key)}</td>
    <td className="one-line">{rlRowCont(r.rinchi_short_key)}</td>
    <td className="one-line">{rlRowCont(r.rinchi_web_key)}</td>
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
    <div className="overflow-x-auto">
      <Table striped bordered condensed hover>
        {tableHeader()}
        {tableBody(objs, molSerials)}
      </Table>
    </div>
  </div>
);

export default SectionReactionList;
