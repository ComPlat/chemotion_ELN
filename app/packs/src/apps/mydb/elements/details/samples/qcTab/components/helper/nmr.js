import React from 'react';
import { AgGridReact } from 'ag-grid-react';

import { iconStatus } from 'src/apps/mydb/elements/details/samples/qcTab/components/helper/icon';
import { numFormat, realFormat } from 'src/apps/mydb/elements/details/samples/qcTab/utils/common';

const tableNmr = (shifts = []) => {
  const renderPrediction = (node) => {
    return numFormat(node.data.prediction);
  }

  const renderReal = (node) => {
    return realFormat(node.data.real, node.data.status);
  }
  
  const renderDiff = (node) => {
    return realFormat(node.data.diff, node.data.status);
  }

  const renderIconStatus = (node) => {
    return iconStatus(node.data.status);
  }

  const renderIconStatusOwner = (node) => {
    return iconStatus(node.data.statusOwner);
  }

  const columnDefs = [
    {
      headerName: "Atom",
      field: "atom",
    },
    {
      headerName: "Prediction (ppm)",
      field: "predition",
      cellRenderer: renderPrediction,
    },
    {
      headerName: "Real (ppm)",
      field: "real",
      cellRenderer: renderReal,
    },
    {
      headerName: "Diff (ppm)",
      field: "diff",
      cellRenderer: renderDiff,
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
        rowData={shifts.sort((a, b) => a.atom - b.atom) || []}
        rowHeight="auto"
        domLayout="autoHeight"
        autoSizeStrategy={{ type: 'fitGridWidth' }}
      />
    </div>
  );
}

const formatQV = (ops) => {
  if (ops[0].insert === '\n') return ops.slice(1);
  return ops;
};

export {
  tableNmr,
  formatQV,
};
