import React from 'react';
import SVG from 'react-inlinesvg';
import { Panel } from 'react-bootstrap';
import Formula from '../common/Formula';
import CommonInput from '../common/CommonInput';
import ReportActions from '../actions/ReportActions';

const Serial = ({serial, counter}) => {
  if (!serial) return null;
  const mol = serial.mol;
  const oddClass = counter % 2 === 1 ? 'order-even' : null;
  const onCompleteEdit = val => ReportActions.updMSVal(mol.id, val);

  return (
    <Panel eventKey={counter} key={counter} >
      <div className="report-serial">
        <div className={`order ${oddClass}`}>{counter + 1}</div>
        <div className="svg">
          <SVG src={mol.svgPath} key={mol.svgPath} />
        </div>
        <div className="info">
          <p><Formula formula={mol.sumFormula} /></p>
          <p>{mol.iupacName}</p>
        </div>
        <div className="input">
          <CommonInput
            value={serial.value}
            key={mol.id}
            placeholder="xx"
            onCompleteEdit={onCompleteEdit}
          />
        </div>
      </div>
    </Panel>
  );
};

const Serials = ({selMolSerials, template}) => {
  if (template !== 'supporting_information') {
    return <h5>This is only available for Supporting Information.</h5>;
  }

  const contents = selMolSerials.map((molSer, i) => (
    <Serial id={i} key={`ms-${molSer.mol.id}`} serial={molSer} counter={i} />
  ));

  return <div className="report-serials">{contents}</div>;
};

export default Serials;
