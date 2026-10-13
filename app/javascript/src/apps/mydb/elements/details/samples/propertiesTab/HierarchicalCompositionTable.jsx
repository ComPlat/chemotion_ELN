import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import buildHierarchicalMaterialRows from 'src/utilities/sampleHierarchicalCompositions';
import { parseFormulaLabel, getMaterialTypeSync } from 'src/utilities/hierarchicalFormulaParser';

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

// Renderer for the Process button column
function ProcessButtonRenderer({ data, onProcess }) {
  if (data?.isSubRow) return null;
  return (
    <Button
      size="sm"
      variant="outline-secondary"
      className="py-0 px-1"
      style={{ fontSize: '0.75rem', lineHeight: '1.4' }}
      onClick={() => onProcess(data)}
    >
      Process
    </Button>
  );
}

ProcessButtonRenderer.propTypes = {
  data: PropTypes.object,
  onProcess: PropTypes.func.isRequired,
};

ProcessButtonRenderer.defaultProps = {
  data: null,
};

const buildCompositionColumnDefs = (onFieldChange, onProcess, onSubRowWeightChange) => [
  {
    headerName: 'Type',
    field: 'materialType',
    minWidth: 90,
    maxWidth: 110,
    headerTooltip: 'Material type resolved from the shape template (Support, Active Phase, Promoter, Body)',
    cellClass: (p) => [
      'lh-base', 'border-end',
      p.data?.isSubRow ? 'text-muted fst-italic' : '',
    ],
    valueGetter: (p) => p.data?.materialType ?? '',
  },
  {
    headerName: 'Components',
    field: 'sourceAlias',
    minWidth: 90,
    headerTooltip: 'Label from the canvas text node attached to this shape',
    cellClass: (p) => [
      'lh-base', 'border-end',
      p.data?.isSubRow ? 'ps-3 text-muted' : '',
    ],
    valueGetter: (p) => {
      if (p.data?.isSubRow) return `  └ ${p.data.segment} [${p.data.elements.join(', ')}]`;
      return p.data?.sourceAlias ?? '';
    },
  },
  {
    headerName: 'Calc. wt. ratio',
    field: 'weightRatioCalcProcessed',
    minWidth: 110,
    headerTooltip: 'Calculated weight ratio derived from the label prefix (e.g. "50%" in "50% SiO2")',
    cellClass: ['lh-base', 'border-end'],
    valueGetter: (p) => (p.data?.isSubRow ? '' : (p.data?.weightRatioCalcProcessed ?? '')),
  },
  {
    headerName: 'Exp. wt. ratio',
    field: 'weight_ratio_exp',
    editable: (p) => !p.data?.isSubRow,
    headerTooltip: 'Experimental weight ratio entered manually — all rows should sum to 100',
    cellClass: (p) => [p.data?.isSubRow ? 'border-end' : 'editable-cell border-end'],
    minWidth: 110,
    valueSetter: (params) => {
      if (params.newValue != null && !params.data?.isSubRow) {
        onFieldChange(params.data.index, 'weight_ratio_exp', params.newValue);
      }
    },
    valueGetter: (p) => (p.data?.isSubRow ? '' : (p.data?.weight_ratio_exp ?? '')),
  },
  {
    headerName: 'Molar mass [g/mol]',
    field: 'molar_mass',
    editable: (p) => !p.data?.isSubRow,
    headerTooltip: 'Molar mass in g/mol — used to calculate molar ratios',
    cellClass: (p) => [p.data?.isSubRow ? 'border-end' : 'editable-cell border-end'],
    minWidth: 110,
    valueSetter: (params) => {
      if (params.newValue != null && !params.data?.isSubRow) {
        onFieldChange(params.data.index, 'molar_mass', params.newValue);
      }
    },
    valueGetter: (p) => (p.data?.isSubRow ? '' : (p.data?.molar_mass ?? '')),
  },
  {
    headerName: 'Calc. mol. ratio',
    field: 'molarRatioCalcMM',
    minWidth: 110,
    headerTooltip: 'Calculated molar ratio = Calc. wt. ratio / Molar mass',
    valueGetter: (p) => (p.data?.isSubRow ? '' : (p.data?.molarRatioCalcMM ?? '-')),
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Exp. mol. ratio',
    field: 'molarRatioExpPercent',
    minWidth: 110,
    headerTooltip: 'Experimental molar ratio percentage = (Exp. wt. ratio / MM) / total molar exp.',
    valueGetter: (p) => {
      if (p.data?.isSubRow) return '';
      return p.data?.molarRatioExpPercent !== '-' ? (p.data?.molarRatioExpPercent ?? '-') : '-';
    },
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Calc. mol. percentage',
    field: 'molarRatioCalcPercent',
    minWidth: 120,
    headerTooltip: 'Calculated molar percentage = (Calc. wt. ratio / MM) / total molar calc.',
    valueGetter: (p) => {
      if (p.data?.isSubRow) return '';
      return p.data?.molarRatioCalcPercent !== '-' ? (p.data?.molarRatioCalcPercent ?? '-') : '-';
    },
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Exp. wt. ratio/MM',
    field: 'weightRatioCalcMM',
    minWidth: 120,
    headerTooltip: 'Experimental weight ratio divided by molar mass',
    valueGetter: (p) => (p.data?.isSubRow ? '' : (p.data?.weightRatioCalcMM ?? '-')),
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Sub-row wt. %',
    field: 'subRowWeight',
    minWidth: 100,
    maxWidth: 120,
    headerTooltip: 'Manual weight percentage for this sub-component (sub-rows only)',
    editable: (p) => !!p.data?.isSubRow,
    cellClass: (p) => [p.data?.isSubRow ? 'editable-cell border-end' : 'border-end'],
    valueGetter: (p) => (p.data?.isSubRow ? (p.data?.subRowWeight ?? '') : ''),
    valueSetter: (params) => {
      if (params.data?.isSubRow) {
        onSubRowWeightChange(params.data.parentIndex, params.data.segIdx, params.newValue);
      }
      return false;
    },
  },
  {
    headerName: '',
    field: 'processBtn',
    minWidth: 80,
    maxWidth: 90,
    editable: false,
    sortable: false,
    headerTooltip: 'Click Process to expand label into constituent elements',
    cellClass: ['border-end', 'd-flex', 'align-items-center'],
    cellRenderer: ProcessButtonRenderer,
    cellRendererParams: { onProcess },
  },
];

/**
 * Renders the hierarchical material composition table using AG Grid.
 * Mounted deferred (one animation frame) to avoid ResizeObserver loop errors
 * when switching sample type during a heavy layout change.
 */
export default function HierarchicalCompositionTable({ components, onFieldChange }) {
  const [mounted, setMounted] = useState(false);
  // key = parent row index, value = parsed segments from parseFormulaLabel
  const [processedRows, setProcessedRows] = useState({});
  // Pre-loaded shapes JSON for synchronous material type resolution
  const [shapesJson, setShapesJson] = useState(null);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Load shapes JSON once for getMaterialTypeSync
  useEffect(() => {
    fetch('/json/surfaceChemistryShapes.json')
      .then((r) => r.json())
      .then(setShapesJson)
      .catch(() => setShapesJson(null));
  }, []);

  const handleProcess = useCallback((rowData) => {
    const segments = parseFormulaLabel(rowData.sourceAlias);
    setProcessedRows((prev) => ({ ...prev, [rowData.index]: segments }));
  }, []);

  const handleSubRowWeightChange = useCallback((parentIndex, segIdx, value) => {
    setProcessedRows((prev) => {
      const segments = [...(prev[parentIndex] || [])];
      segments[segIdx] = { ...segments[segIdx], weight: value };
      return { ...prev, [parentIndex]: segments };
    });
  }, []);

  const columnDefs = useCallback(
    () => buildCompositionColumnDefs(onFieldChange, handleProcess, handleSubRowWeightChange),
    [onFieldChange, handleProcess, handleSubRowWeightChange],
  )();

  const { rowsData, totalExpWtRatio } = buildHierarchicalMaterialRows(components);
  const baseRows = Array.isArray(rowsData) ? rowsData : [];

  // Attach materialType to each row using shapesJson (sync lookup)
  const rowsWithType = useMemo(() => baseRows.map((row) => ({
    ...row,
    materialType: getMaterialTypeSync(row.template_id, shapesJson),
  })), [baseRows, shapesJson]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inject sub-rows after each processed parent row
  const gridRowData = useMemo(() => {
    const result = [];
    rowsWithType.forEach((row) => {
      result.push(row);
      const segments = processedRows[row.index];
      if (segments) {
        segments.forEach((seg, segIdx) => {
          result.push({
            isSubRow: true,
            parentIndex: row.index,
            segIdx,
            segment: seg.segment,
            elements: seg.elements,
            subRowWeight: seg.weight ?? '',
            materialType: row.materialType,
            _subRowId: `subrow-${row.index}-${segIdx}`,
          });
        });
      }
    });
    return result;
  }, [rowsWithType, processedRows]);

  const fitColumnsToGrid = useCallback((params) => {
    params.api.sizeColumnsToFit();
  }, []);

  const getRowId = useCallback((params) => {
    if (params.data?.isSubRow) return params.data._subRowId;
    const id = params.data?.index;
    return id !== undefined && id !== null ? `component-${id}` : `row-${params.node?.rowIndex ?? 0}`;
  }, []);

  const getRowClass = useCallback((params) => {
    if (params.data?.isSubRow) return 'bg-light';
    return '';
  }, []);

  const expWtRatioSum = typeof totalExpWtRatio === 'number' ? totalExpWtRatio : 0;
  const showWarning = expWtRatioSum > 0 && Math.abs(expWtRatioSum - 100) > 0.001;

  if (!mounted) return null;

  return (
    <>
      <h5 className="mt-3 d-flex align-items-center gap-2">
        Composition table:
        {showWarning && (
          <span className="badge bg-warning text-dark">
            {`⚠ Exp. wt. ratio sum = ${expWtRatioSum} (expected 100)`}
          </span>
        )}
      </h5>
      <div className="ag-theme-alpine sample-form-composition-grid mb-3">
        <AgGridReact
          columnDefs={columnDefs}
          defaultColDef={COMPOSITION_DEFAULT_COL_DEF}
          rowData={gridRowData}
          getRowId={getRowId}
          getRowClass={getRowClass}
          rowHeight={25}
          domLayout="autoHeight"
          onGridReady={fitColumnsToGrid}
          onGridSizeChanged={fitColumnsToGrid}
          onFirstDataRendered={fitColumnsToGrid}
          tooltipShowDelay={300}
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
