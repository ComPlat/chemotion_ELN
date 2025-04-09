// TODO: check if imported_readout is still functionality that is used or if it is abandoned and should be removed

import React, { useRef, useCallback, useState } from 'react';
import PropTypes from 'prop-types';
import SVG from 'react-inlinesvg';
import { AgGridReact } from 'ag-grid-react';

const WellplateList = ({ wells, readoutTitles, handleWellsChange }) => {
  const gridRef = useRef();
  const [wellsList, setWellsList] = useState(wells);

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

  const updateRow = useCallback(({ data: oldRow, colDef, newValue }) => {
    const { field, cellRendererParams } = colDef;
    if (!oldRow.sample) { return null }

    const wellIndex = wellsList.indexOf(oldRow);
    wellsList[wellIndex].readouts[cellRendererParams.index][field] = newValue;
    setWellsList(wellsList);
    handleWellsChange(wellsList);
  }, [wellsList, readoutTitles]);

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
      wrapText: true,
      cellClass: ["lh-base", "py-2", "border-end"],
    },
    {
      headerName: "External Label",
      field: "external_label",
      cellRenderer: renderExternalLabel,
      wrapText: true,
      cellClass: ["lh-base", "py-2", "border-end"],
    },
    {
      headerName: "Sum-Formula",
      field: "short_label",
      cellRenderer: renderSumFormula,
      wrapText: true,
      cellClass: ["lh-base", "py-2", "border-end"],
    },
  ];

  readoutTitles && readoutTitles.map((title, index) => {
    columnDefs.push(
      {
        headerName: `${title} Value`,
        field: "value",
        editable: (params) => params.data.sample,
        valueGetter: (params) => {
          if (params.data?.readouts) {
            return params.data.readouts[index].value;
          }
        },
        valueSetter: (params) => {
          params.data.readouts[index].value = params.newValue;
          return true;
        },
        valueParser: (params) => {
          return params.newValue;
        },
        cellRendererParams: {
          index: index,
        },
        cellClass: ["editable-cell", "border-end", "px-2"],
      },
      {
        headerName: `${title} Unit`,
        field: "unit",
        editable: (params) => params.data.sample,
        valueGetter: (params) => {
          if (params.data?.readouts) {
            return params.data.readouts[index].unit;
          }
        },
        valueSetter: (params) => {
          params.data.readouts[index].unit = params.newValue;
          return true;
        },
        valueParser: (params) => {
          return params.newValue;
        },
        cellClass: ["editable-cell", "border-end", "px-2"],
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
    resizable: false,
    suppressMovable: true,
    cellClass: ["border-end", "px-2"],
    headerClass: ["border-end", "px-2"]
  };

  return (
    <div className="ag-theme-alpine">
      <AgGridReact
        ref={gridRef}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowData={wellsList}
        rowHeight="auto"
        domLayout="autoHeight"
        autoSizeStrategy={{ type: 'fitGridWidth' }}
        readOnlyEdit
        onCellEditRequest={updateRow}
        singleClickEdit={true}
        stopEditingWhenCellsLoseFocus={true}
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
