// TODO: check if imported_readout is still functionality that is used or if it is abandoned and should be removed

import React, { useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
// import { Form } from 'react-bootstrap';
import SVG from 'react-inlinesvg';
import { AgGridReact } from 'ag-grid-react';

const WellplateList = ({ wells, readoutTitles, handleWellsChange }) => {
  // let timeout = null;
  const gridRef = useRef();

  // const handleReadoutOfWellChange = (well, index, type, event) => {
  //   const { value } = event.target;
  //   const wellIndex = wells.indexOf(well);
  //   wells[wellIndex].readouts[index][type] = value;
 
  //   clearTimeout(timeout);
  //   timeout = setTimeout(() => {
  //     handleWellsChange(wells);
  //   }, 3000);
  // }

  const renderSVG = (node) => {
    const sample = node.data?.sample;
    if (!sample) { return null; }

    return (
      <SVG className="molecule-small" src={`/images/molecules/${sample.molecule.molecule_svg_file}`} />
    );
  }

  const renderName = (node) => {
    const sample = node.data?.sample;
    if (!sample) { return null; }

    return sample.short_label;
  }

  const renderExternalLabel = (node) => {
    const sample = node.data?.sample;
    if (!sample) { return null; }

    return sample.external_label;
  }

  const renderSumFormula = (node) => {
    const sample = node.data?.sample;
    if (!sample) { return null; }

    return sample.molecule_formula;
  }

  const renderReadoutValue = (node) => {
    const readouts = node.data?.readouts;
    if (!node.data.sample) { return null; }
    return readouts[node.index].value;
    //return (
    //  <Form.Control
    //    value={readouts[node.index].value || ''}
    //    onChange={(event) => handleReadoutOfWellChange(node.data, node.index, 'value', event)}
    //    className="my-2"
    //  />
    //);
  }

  const renderReadoutUnit = (node) => {
    const readouts = node.data?.readouts;
    if (!node.data.sample) { return null; }
    return readouts[node.index].unit;

    //return (
    //  <Form.Control
    //    value={readouts[node.index].unit || ''}
    //    onChange={(event) => handleReadoutOfWellChange(node.data, node.index, 'unit', event)}
    //    className="my-2"
    //  />
    //);
  }

  const updateRow = useCallback(({ data: oldRow, colDef, newValue }) => {
    const { field, cellRendererParams } = colDef;
    if (!oldRow.sample) { return null }

    const wellIndex = wells.indexOf(oldRow);
    wells[wellIndex].readouts[cellRendererParams.index][field] = newValue;
    handleWellsChange(wells);
  }, [wells, readoutTitles]);

  const columnDefs = [
    {
      headerName: "#",
      minWidth: 35,
      maxWidth: 35,
      valueGetter: "node.rowIndex + 1",
    },
    {
      headerName: "Position",
      field: "alphanumericPosition",
      minWidth: 70,
      maxWidth: 70,
    },
    {
      headerName: "Molecule",
      field: "sample",
      minWidth: 75,
      maxWidth: 75,
      cellRenderer: renderSVG,
      cellClass: ["text-center", "py-2", "border-end"],
    },
    {
      headerName: "Name",
      field: "short_label",
      cellRenderer: renderName,
    },
    {
      headerName: "External Label",
      field: "external_label",
      cellRenderer: renderExternalLabel,
    },
    {
      headerName: "Sum-Formula",
      field: "short_label",
      cellRenderer: renderSumFormula,
    },
  ];

  readoutTitles && readoutTitles.map((title, index) => {
    columnDefs.push(
      {
        headerName: `${title} Value`,
        field: "value",
        editable: true,
        cellRenderer: renderReadoutValue,
        cellRendererParams: {
          index: index,
        }
      },
      {
        headerName: `${title} Unit`,
        field: "unit",
        editable: true,
        cellRenderer: renderReadoutUnit,
        cellRendererParams: {
          index: index,
        }
      },
    );
  });

  const defaultColDef = {
    editable: false,
    flex: 1,
    wrapHeaderText: true,
    autoHeaderHeight: true,
    autoHeight: true,
    sortable: false,
    resizable: true,
    cellClass: ["border-end", "px-2"],
    headerClass: ["px-2"]
  };

  return (
    <div className="ag-theme-alpine">
      <AgGridReact
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowData={wells}
        domLayout="autoHeight"
        readOnlyEdit
        onCellEditRequest={updateRow}
      />
    </div>
  );
}

export default WellplateList;

WellplateList.propTypes = {
  wells: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  readoutTitles: PropTypes.array.isRequired, // eslint-disable-line react/forbid-prop-types
  handleWellsChange: PropTypes.func.isRequired
};
