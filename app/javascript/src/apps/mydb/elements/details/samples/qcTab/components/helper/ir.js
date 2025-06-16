import React from 'react';
import { AgGridReact } from 'ag-grid-react';

import { iconStatus } from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/icon';

const colorStyles = [
  { backgroundColor: '#FFFF00' },
  { backgroundColor: '#87CEFA' },
  { backgroundColor: '#FFB6C1' },
  { backgroundColor: '#00FF00' },
  { backgroundColor: '#E6E6FA' },
  { backgroundColor: '#FFD700' },
  { backgroundColor: '#F0FFFF' },
  { backgroundColor: '#F5F5DC' },
];

const colorLabel = (idx) => {
  const style = Object.assign(
    {},
    colorStyles[idx % 8],
    { width: 25, height: 25 },
  );

  return (
    <div
      style={style}
      className="badge rounded-circle p-2 mt-2 text-center"
    >
      <span className="text-black">
        {idx + 1}
      </span>
    </div>
  );
};

const tableIr = (fgs) => {
  if (!fgs) return null;

  const renderColorLabel = (node) => {
    return colorLabel(node.node.rowIndex);
  }

  const renderIconStatus = (node) => {
    return iconStatus(node.data.status);
  }

  const renderIconStatusOwner = (node) => {
    return iconStatus(node.data.statusOwner);
  }

  const columnDefs = [
    {
      headerName: "#",
      valueGetter: "node.rowIndex + 1",
      cellRenderer: renderColorLabel,
    },
    {
      headerName: "SMARTS",
      field: "sma",
    },
    {
      headerName: "Machine Confidence",
      field: "confidence",
    },
    {
      headerName: "Machine",
      field: "status",
      cellRenderer: renderIconStatus,
    },
    {
      headerName: "Owner",
      field: "statusOwner",
      cellRenderer: renderIconStatusOwner,
    },
  ];

  const defaultColDef = {
    editable: false,
    flex: 1,
    autoHeight: true,
    sortable: false,
    resizable: false,
    suppressMovable: true,
    cellClass: ["border-end", "px-2"],
    headerClass: ["border-end", "px-2"]
  };

  return (
    <div className="ag-theme-alpine w-100 mb-4">
      <AgGridReact
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowData={fgs.sort((a, b) => b.confidence - a.confidence) || []}
        rowHeight="auto"
        domLayout="autoHeight"
        autoSizeStrategy={{ type: 'fitGridWidth' }}
      />
    </div>
  );
};

export { tableIr }; // eslint-disable-line
