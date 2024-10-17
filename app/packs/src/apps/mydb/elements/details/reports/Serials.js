import React from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';
import Formula from 'src/components/common/Formula';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import { Table, Form } from 'react-bootstrap';

const Serial = ({ serial, counter }) => {
  if (!serial) return null;

  const { mol, value } = serial;
  const onCompleteEdit = (e) => {
    const val = e.target.value;
    ReportActions.updMSVal(mol.id, val);
  };

  return (
    <tr className="report-serial">
      <td valign="middle">{counter + 1}</td>
      <td valign="middle">
        <SVG src={mol.svgPath} key={mol.svgPath} />
      </td>
      <td>
        <Formula formula={mol.sumFormula} />
        <div className="mt-3">{mol.iupacName}</div>
      </td>
      <td valign="middle">
        <Form.Control
          value={value}
          placeholder="xx"
          onChange={onCompleteEdit}
        />
      </td>
    </tr>
  );
};

Serial.propTypes = {
  serial: PropTypes.shape({
    // eslint-disable-next-line react/forbid-prop-types
    mol: PropTypes.object.isRequired,
    value: PropTypes.string.isRequired,
  }).isRequired,
  counter: PropTypes.number.isRequired,
};

const Serials = ({ template, selMolSerials }) => {
  const isApplicable = [
    'spectrum',
    'supporting_information',
    'supporting_information_std_rxn',
    'rxn_list_xlsx',
    'rxn_list_csv',
    'rxn_list_html',
  ].includes(template.value);

  if (!isApplicable) {
    return (
      <h5>Not applicable.</h5>
    );
  }

  return (
    <Table striped bordered>
      <tbody>
        {selMolSerials.map((molSer, i) => (
          <Serial
            key={`ms-${molSer.mol.id}`}
            serial={molSer}
            counter={i}
          />
        ))}
      </tbody>
    </Table>
  );
};

Serials.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  template: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  selMolSerials: PropTypes.array.isRequired,
};

export default Serials;
