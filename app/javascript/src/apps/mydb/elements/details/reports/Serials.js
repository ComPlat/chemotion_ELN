import React from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';
import Formula from 'src/components/common/Formula';
import ReportActions from 'src/stores/alt/actions/ReportActions';
import { Form } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';

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

  const renderSVG = (node) => {
    const mol = node.data.mol;
    return (<SVG src={mol.svgPath} key={mol.svgPath} />);
  }

  const renderFormulaAndName = (node) => {
    const mol = node.data.mol;
    return (
      <>
        <Formula formula={mol.sumFormula} />
        <div className="mt-3">{mol.iupacName}</div>
      </>
    );
  }

  const changeInput = (mol) => (e) => {
    const val = e.target.value;
    ReportActions.updMSVal(mol.id, val);
  }

  const renderValueInput = (node) => {
    const serial = node.data;
    return (
      <Form.Control
        value={serial.value}
        placeholder="xx"
        onChange={(e) => changeInput(serial.mol, e)}
      />
    );
  }

  const columnDefs = [
    {
      headerName: "Nr",
      minWidth: 50,
      maxWidth: 50,
      valueGetter: "node.rowIndex + 1",
    },
    {
      headerName: "Molecule",
      field: "svgPath",
      minWidth: 220,
      maxWidth: 220,
      cellRenderer: renderSVG,
      cellClass: ["text-center", "py-3", "border-end"],
    },
    {
      headerName: "Formula / Name",
      field: "sumFormula",
      cellRenderer: renderFormulaAndName,
      wrapText: true,
      cellClass: ["lh-base", "py-2", "border-end"],
    },
    {
      headerName: "Value",
      field: 'value',
      minWidth: 120,
      maxWidth: 180,
      cellRenderer: renderValueInput,
      cellClass: ["py-3", "border-end-0"],
    },
  ];

  const defaultColDef = {
    editable: false,
    flex: 1,
    autoHeight: true,
    sortable: false,
    resizable: false,
    cellClass: ["border-end"],
    headerClass: ["border-end", "px-2"]
  };

  return (
    <div className="ag-theme-alpine">
      <AgGridReact
        columnDefs={columnDefs}
        autoSizeStrategy={{ type: 'fitGridWidth' }}
        defaultColDef={defaultColDef}
        rowData={selMolSerials}
        rowHeight="auto"
        domLayout="autoHeight"
      />
    </div>
  );
};

Serials.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  template: PropTypes.object.isRequired,
  // eslint-disable-next-line react/forbid-prop-types
  selMolSerials: PropTypes.array.isRequired,
};

export default Serials;
