import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AgGridReact } from 'ag-grid-react';
import buildHierarchicalMaterialRows from 'src/utilities/sampleHierarchicalCompositions';

const COMPOSITION_DEFAULT_COL_DEF = {
  editable: false,
  flex: 1,
  wrapHeaderText: true,
  autoHeaderHeight: true,
  autoHeight: true,
  sortable: false,
  resizable: false,
  suppressMovable: true,
  cellClass: ['border-end'],
  headerClass: ['border-end', 'px-2'],
};

const buildCompositionColumnDefs = (onFieldChange) => [
  {
    headerName: 'Components',
    field: 'sourceAlias',
    minWidth: 90,
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Calc. wt. ratio',
    field: 'weightRatioCalcProcessed',
    minWidth: 110,
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Exp. wt. ratio',
    field: 'weight_ratio_exp',
    editable: true,
    cellClass: ['editable-cell', 'border-end'],
    minWidth: 110,
    valueSetter: (params) => {
      if (params.newValue != null) onFieldChange(params.data.index, 'weight_ratio_exp', params.newValue);
    },
  },
  {
    headerName: 'Molar mass [g/mol]',
    field: 'molar_mass',
    editable: true,
    cellClass: ['editable-cell', 'border-end'],
    minWidth: 110,
    valueSetter: (params) => {
      if (params.newValue != null) onFieldChange(params.data.index, 'molar_mass', params.newValue);
    },
  },
  {
    headerName: 'Calc. mol. ratio',
    field: 'molarRatioCalcMM',
    minWidth: 110,
    valueGetter: (p) => (p.data?.molarRatioCalcMM ?? '-'),
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Exp. mol. ratio',
    field: 'molarRatioExpPercent',
    minWidth: 110,
    valueGetter: (p) => (p.data?.molarRatioExpPercent !== '-' ? (p.data?.molarRatioExpPercent ?? '-') : '-'),
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Calc. mol. percentage',
    field: 'molarRatioCalcPercent',
    minWidth: 120,
    valueGetter: (p) => (p.data?.molarRatioCalcPercent !== '-' ? (p.data?.molarRatioCalcPercent ?? '-') : '-'),
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Exp. wt. ratio/MM',
    field: 'weightRatioCalcMM',
    minWidth: 120,
    valueGetter: (p) => (p.data?.weightRatioCalcMM ?? '-'),
    cellClass: ['lh-base', 'border-end'],
  },
];

/**
 * Renders the hierarchical material composition table using AG Grid.
 * Mounted deferred (one animation frame) to avoid ResizeObserver loop errors
 * when switching sample type during a heavy layout change.
 */
export default function HierarchicalCompositionTable({ components, onFieldChange }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const columnDefs = useCallback(() => buildCompositionColumnDefs(onFieldChange), [onFieldChange])();
  const { rowsData } = buildHierarchicalMaterialRows(components);
  const gridRowData = Array.isArray(rowsData) ? rowsData : [];
  const fitColumnsToGrid = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);

  const getRowId = useCallback((params) => {
    const id = params.data?.index;
    return id !== undefined && id !== null ? `component-${id}` : `row-${params.node?.rowIndex ?? 0}`;
  }, []);

  if (!mounted) return null;

  return (
    <>
      <h5 className="mt-3">Composition table:</h5>
      <div className="ag-theme-alpine sample-form-composition-grid mb-3">
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={COMPOSITION_DEFAULT_COL_DEF}
          rowData={gridRowData}
          getRowId={getRowId}
          rowHeight={25}
          domLayout="autoHeight"
          onGridReady={fitColumnsToGrid}
          onGridSizeChanged={fitColumnsToGrid}
          onFirstDataRendered={fitColumnsToGrid}
          singleClickEdit
          stopEditingWhenCellsLoseFocus
          overlayNoRowsTemplate="Create sample to generate the table."
        />
      </div>
    </>
  );
}

HierarchicalCompositionTable.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  components: PropTypes.array.isRequired,
  onFieldChange: PropTypes.func.isRequired,
};
