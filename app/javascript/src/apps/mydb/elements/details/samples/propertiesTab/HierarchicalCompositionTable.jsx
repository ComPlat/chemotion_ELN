import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { Button, Form } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import buildHierarchicalMaterialRows from 'src/utilities/sampleHierarchicalCompositions';
import {
  parseFormulaLabel,
  parseFormulaToElements,
  getMaterialTypeSync,
  extractWeightPrefix,
} from 'src/utilities/hierarchicalFormulaParser';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';

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

// Radio-style cell renderer for the Active column — matches the reaction scheme reference radio.
function ActiveCellRenderer({ data, onSetActive }) {
  if (!data?.isSubRow) return null;
  return (
    <div className="d-flex align-items-center justify-content-center h-100">
      <Form.Check
        type="radio"
        name={`active-subrow-${data.parentIndex}`}
        checked={!!data.isActive}
        title={data.isActive ? 'Active element (click to deselect)' : 'Set as active element'}
        className="m-1"
        onChange={() => onSetActive(data.parentIndex, data.segIdx)}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

ActiveCellRenderer.propTypes = {
  data: PropTypes.object,
  onSetActive: PropTypes.func.isRequired,
};

ActiveCellRenderer.defaultProps = {
  data: null,
};

// A1: Inline cell renderer for the Components column.
// Shows the label text with a ▶ process button for parent rows;
// shows "└ Element (parentFormula)" for element-level sub-rows.
function ComponentsCellRenderer({ data, onProcess }) {
  if (data?.isSubRow) {
    return (
      <span className="ps-3 text-muted fst-italic">
        {`└ ${data.element} (${data.segmentFormula})`}
      </span>
    );
  }
  return (
    <div className="d-flex align-items-center justify-content-between w-100 gap-1">
      <span
        className="text-truncate"
        style={{ minWidth: 0 }}
        title={data?.sourceAlias ?? ''}
      >
        {data?.sourceAlias ?? ''}
      </span>
      {!data?.isSingleElement && (
        <Button
          size="sm"
          variant={data?.isProcessed ? 'outline-success' : 'outline-secondary'}
          className="py-0 px-1 flex-shrink-0"
          style={{ fontSize: '0.7rem', lineHeight: '1.4' }}
          title={data?.isProcessed ? 'Re-process label' : 'Expand into constituent elements'}
          onClick={(e) => { e.stopPropagation(); onProcess(data); }}
        >
          {data?.isProcessed ? '✓' : '▶'}
        </Button>
      )}
    </div>
  );
}

ComponentsCellRenderer.propTypes = {
  data: PropTypes.object,
  onProcess: PropTypes.func.isRequired,
};

ComponentsCellRenderer.defaultProps = {
  data: null,
};

// A2: Custom header for the "Exp. wt. ratio" column.
// Shows a ⚠ icon when the sum deviates from 100; tooltip explains current value.
function ExpWtRatioHeader({ displayName, showWarning, expWtRatioSum }) {
  const tooltip = showWarning
    ? `⚠ Sum is ${expWtRatioSum.toFixed(1)}% — all rows should total 100`
    : 'Experimental weight ratio entered manually — all rows should sum to 100';
  return (
    <div
      className="d-flex align-items-center gap-1 w-100"
      style={{ cursor: 'default' }}
      title={tooltip}
    >
      <span className="ag-header-cell-text">{displayName}</span>
      {showWarning && (
        <span style={{ color: '#e6a817', fontWeight: 'bold', fontSize: '0.9rem' }}>⚠</span>
      )}
    </div>
  );
}

ExpWtRatioHeader.propTypes = {
  displayName: PropTypes.string,
  showWarning: PropTypes.bool,
  expWtRatioSum: PropTypes.number,
};

ExpWtRatioHeader.defaultProps = {
  displayName: 'Exp. wt. ratio',
  showWarning: false,
  expWtRatioSum: 0,
};

const buildCompositionColumnDefs = (
  onFieldChange,
  onProcess,
  onSetActive,
  onSubRowStoichChange,
  onSubRowCalcWtChange,
  onSubRowExpWtChange,
  showWarning,
  expWtRatioSum,
) => [
  {
    headerName: '',
    field: 'isActive',
    minWidth: 36,
    maxWidth: 36,
    headerTooltip: 'Mark one element per component as active',
    cellClass: ['border-end', 'p-0'],
    cellRenderer: ActiveCellRenderer,
    cellRendererParams: { onSetActive },
  },
  {
    // A3: tooltipValueGetter shows the full sub-type on cell hover
    headerName: 'Type',
    field: 'materialType',
    minWidth: 90,
    maxWidth: 110,
    headerTooltip: 'Material type resolved from the shape template (Support, Active Phase, Promoter, Body)',
    cellClass: (p) => [
      'lh-base', 'border-end',
      p.data?.isSubRow ? 'text-muted fst-italic' : '',
    ],
    valueGetter: (p) => (p.data?.isSubRow ? '' : (p.data?.materialType ?? '')),
    tooltipValueGetter: (p) => {
      if (p.data?.isSubRow) return null;
      const sub = p.data?.materialSubType;
      if (!sub || sub === p.data?.materialType || sub === 'Unknown') return null;
      return sub;
    },
  },
  {
    // A1: cellRenderer shows label + inline process button for parents; element info for sub-rows
    headerName: 'Components',
    field: 'sourceAlias',
    minWidth: 120,
    headerTooltip: 'Label from the canvas text node attached to this shape',
    cellClass: (p) => ['lh-base', 'border-end', p.data?.isSubRow ? '' : 'px-1'],
    cellRenderer: ComponentsCellRenderer,
    cellRendererParams: { onProcess },
  },
  {
    // Mode B entry point: editing calcWt on a sub-row back-calculates stoich for the segment group
    headerName: 'Calc. wt. ratio',
    field: 'weightRatioCalcProcessed',
    minWidth: 110,
    headerTooltip: 'For parent rows: weight ratio from the label prefix. For element rows: editable — updates stoich automatically (Mode B).',
    editable: (p) => !!p.data?.isSubRow,
    cellClass: (p) => [p.data?.isSubRow ? 'editable-cell border-end' : 'lh-base border-end'],
    valueGetter: (p) => {
      if (p.data?.isSubRow) return p.data?.calcWt != null ? p.data.calcWt : '';
      return p.data?.weightRatioCalcProcessed ?? '';
    },
    valueSetter: (params) => {
      if (params.data?.isSubRow) {
        const val = parseFloat(params.newValue);
        if (Number.isFinite(val) && val > 0) {
          onSubRowCalcWtChange(params.data.parentIndex, params.data.segIdx, val);
        }
      }
      return false;
    },
  },
  {
    // A2: custom header with live ⚠ warning icon
    headerName: 'Exp. wt. ratio',
    field: 'weight_ratio_exp',
    editable: true,
    cellClass: () => ['editable-cell border-end'],
    minWidth: 110,
    headerComponent: ExpWtRatioHeader,
    headerComponentParams: { showWarning, expWtRatioSum },
    valueSetter: (params) => {
      if (params.data?.isSubRow) {
        onSubRowExpWtChange(params.data.parentIndex, params.data.segIdx, params.newValue);
      } else if (params.newValue != null) {
        onFieldChange(params.data.index, 'weight_ratio_exp', params.newValue);
      }
      return false;
    },
    valueGetter: (p) => {
      if (p.data?.isSubRow) return p.data?.expWt ?? '';
      return p.data?.weight_ratio_exp ?? '';
    },
  },
  {
    headerName: 'Molar mass [g/mol]',
    field: 'molar_mass',
    editable: (p) => !p.data?.isSubRow,
    headerTooltip: 'Molar mass in g/mol — atomic mass for element rows, compound mass for parent rows',
    cellClass: (p) => [p.data?.isSubRow ? 'border-end' : 'editable-cell border-end'],
    minWidth: 110,
    valueSetter: (params) => {
      if (params.newValue != null && !params.data?.isSubRow) {
        onFieldChange(params.data.index, 'molar_mass', params.newValue);
      }
      return false;
    },
    valueGetter: (p) => {
      if (p.data?.isSubRow) return p.data?.atomicMass != null ? p.data.atomicMass : '';
      return p.data?.molar_mass ?? '';
    },
  },
  {
    // Calc. mol. ratio column — shows stoichiometry for element sub-rows (editable),
    // and the parent-level calc molar ratio for parent rows.
    headerName: 'Calc. mol. ratio / Stoich.',
    field: 'molarRatioCalcMM',
    minWidth: 110,
    headerTooltip: 'For element sub-rows: stoichiometric count (editable — recalculates wt%). For parent rows: Calc. wt. ratio / Molar mass.',
    editable: (p) => !!p.data?.isSubRow,
    cellClass: (p) => [p.data?.isSubRow ? 'editable-cell border-end' : 'lh-base border-end'],
    valueSetter: (params) => {
      if (params.data?.isSubRow) {
        const newStoich = parseFloat(params.newValue);
        if (Number.isFinite(newStoich) && newStoich > 0) {
          onSubRowStoichChange(params.data.parentIndex, params.data.segIdx, newStoich);
        }
      }
      return false;
    },
    valueGetter: (p) => {
      if (p.data?.isSubRow) return p.data?.stoich ?? '';
      return p.data?.molarRatioCalcMM ?? '-';
    },
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
];

/**
 * Renders the hierarchical material composition table using AG Grid.
 * Mounted deferred (one animation frame) to avoid ResizeObserver loop errors
 * when switching sample type during a heavy layout change.
 */
export default function HierarchicalCompositionTable({ components, onFieldChange }) {
  const [mounted, setMounted] = useState(false);
  // key = parent row index, value = array of element-level sub-rows
  const [processedRows, setProcessedRows] = useState({});
  // key = parent row index, value = segIdx of the active (selected) sub-row
  const [activeSubRows, setActiveSubRows] = useState({});
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

  // A4 (revised): Parse the label into element-level sub-rows.
  // For each formula segment (split by "/"), decompose into constituent elements.
  // Fetch atomic masses via the existing molecular-mass service.
  // calcWt for each element = segCalcWt × (stoich × atomicMass) / Σ(stoich_i × MM_i)
  const handleProcess = useCallback(async (rowData) => {
    const parentWeight = extractWeightPrefix(rowData.sourceAlias);
    const segments = parseFormulaLabel(rowData.sourceAlias);

    // Fetch segment-level compound masses to split parentWeight across "/" segments
    const segMasses = await Promise.all(
      segments.map((seg) => MoleculesFetcher.calculateMolecularMassFromSumFormula(seg.segment)
        .catch(() => null)),
    );
    const totalSegMass = segMasses.reduce((s, m) => s + (m || 0), 0);

    const allSubRows = [];

    for (let si = 0; si < segments.length; si += 1) {
      const seg = segments[si];
      const segMass = segMasses[si];

      // Portion of parentWeight allocated to this "/" segment
      const segCalcWt = parentWeight !== null && segMass != null && totalSegMass > 0
        ? parentWeight * segMass / totalSegMass
        : parentWeight;

      const elemCounts = parseFormulaToElements(seg.segment);
      if (elemCounts.length === 0) continue; // eslint-disable-line no-continue

      // Fetch atomic masses for each element symbol
      // eslint-disable-next-line no-await-in-loop
      const atomicMasses = await Promise.all(
        elemCounts.map(({ element }) => MoleculesFetcher.calculateMolecularMassFromSumFormula(element)
          .catch(() => null)),
      );

      // Σ(stoich_i × MM_i) — denominator for element weight fraction
      const elemTotalMass = elemCounts.reduce(
        (s, { count }, i) => (atomicMasses[i] ? s + count * atomicMasses[i] : s), 0,
      );

      elemCounts.forEach(({ element, count }, i) => {
        const atomicMass = atomicMasses[i];
        const calcWt = atomicMass && elemTotalMass > 0 && segCalcWt != null
          ? +((count * atomicMass / elemTotalMass * segCalcWt).toFixed(4))
          : null;
        allSubRows.push({
          element,
          stoich: count,
          atomicMass: atomicMass ?? null,
          calcWt,
          expWt: '',
          segmentFormula: seg.segment,
          segmentCalcWt: segCalcWt,
        });
      });
    }

    setProcessedRows((prev) => ({ ...prev, [rowData.index]: allSubRows }));
  }, []);

  // Bidirectional calc: user edits stoich → recalculate calcWt for all elements in that segment
  const handleSubRowStoichChange = useCallback((parentIndex, segIdx, newStoich) => {
    setProcessedRows((prev) => {
      const rows = [...(prev[parentIndex] || [])];
      if (!rows[segIdx]) return prev;
      rows[segIdx] = { ...rows[segIdx], stoich: newStoich };
      const { segmentFormula, segmentCalcWt } = rows[segIdx];

      // Recompute Σ(stoich_i × MM_i) for the segment group
      const groupTotalMass = rows
        .filter((r) => r.segmentFormula === segmentFormula)
        .reduce((s, r) => s + (r.stoich || 0) * (r.atomicMass || 0), 0);

      const updated = rows.map((r) => {
        if (r.segmentFormula !== segmentFormula || !r.atomicMass || groupTotalMass === 0) return r;
        return {
          ...r,
          calcWt: +((r.stoich * r.atomicMass / groupTotalMass * (segmentCalcWt ?? 0)).toFixed(4)),
        };
      });
      return { ...prev, [parentIndex]: updated };
    });
  }, []);

  // Mode B: user edits calcWt → back-calculate stoich for all elements in the segment
  // stoich_i = (calcWt_i / MM_i) / min(calcWt_j / MM_j) — normalized so smallest = 1
  const handleSubRowCalcWtChange = useCallback((parentIndex, segIdx, newCalcWt) => {
    setProcessedRows((prev) => {
      const rows = [...(prev[parentIndex] || [])];
      if (!rows[segIdx]) return prev;
      rows[segIdx] = { ...rows[segIdx], calcWt: newCalcWt };
      const { segmentFormula } = rows[segIdx];

      const groupIndices = rows.reduce((acc, r, i) => {
        if (r.segmentFormula === segmentFormula) acc.push(i);
        return acc;
      }, []);

      const mols = groupIndices.map((i) => {
        const r = rows[i];
        return r.atomicMass && r.atomicMass > 0 && r.calcWt > 0
          ? r.calcWt / r.atomicMass
          : 0;
      });

      const validMols = mols.filter((m) => m > 0);
      const minMol = validMols.length > 0 ? Math.min(...validMols) : 0;

      const updated = [...rows];
      if (minMol > 0) {
        groupIndices.forEach((ri, gi) => {
          updated[ri] = { ...updated[ri], stoich: +(mols[gi] / minMol).toFixed(4) };
        });
      }

      return { ...prev, [parentIndex]: updated };
    });
  }, []);

  const handleSubRowExpWtChange = useCallback((parentIndex, segIdx, value) => {
    setProcessedRows((prev) => {
      const rows = [...(prev[parentIndex] || [])];
      if (!rows[segIdx]) return prev;
      rows[segIdx] = { ...rows[segIdx], expWt: value };
      return { ...prev, [parentIndex]: rows };
    });
  }, []);

  // Radio-select: one active sub-row per parent. Clicking again deselects.
  const handleSetActiveSubRow = useCallback((parentIndex, segIdx) => {
    setActiveSubRows((prev) => {
      const current = prev[parentIndex];
      return { ...prev, [parentIndex]: current === segIdx ? null : segIdx };
    });
  }, []);

  const { rowsData, totalExpWtRatio } = buildHierarchicalMaterialRows(components);
  const baseRows = Array.isArray(rowsData) ? rowsData : [];

  // A3: Attach both materialType (short) and materialSubType (full sub-tab label)
  const rowsWithType = useMemo(() => baseRows.map((row) => {
    const { type, subType } = getMaterialTypeSync(row.template_id, shapesJson);
    return { ...row, materialType: type, materialSubType: subType };
  }), [baseRows, shapesJson]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inject element-level sub-rows after each processed parent row; flag parent as processed
  const gridRowData = useMemo(() => {
    const result = [];
    rowsWithType.forEach((row) => {
      const subRows = processedRows[row.index];
      // Count total distinct elements across all "/" segments in the label
      const segments = parseFormulaLabel(row.sourceAlias);
      const totalElements = segments.reduce(
        (sum, seg) => sum + parseFormulaToElements(seg.segment).length, 0,
      );
      result.push({ ...row, isProcessed: !!subRows, isSingleElement: totalElements <= 1 });
      if (subRows) {
        const activeIdx = activeSubRows[row.index] ?? null;
        subRows.forEach((sr, segIdx) => {
          result.push({
            isSubRow: true,
            parentIndex: row.index,
            segIdx,
            element: sr.element,
            stoich: sr.stoich,
            atomicMass: sr.atomicMass,
            calcWt: sr.calcWt,
            expWt: sr.expWt,
            segmentFormula: sr.segmentFormula,
            segmentCalcWt: sr.segmentCalcWt,
            isActive: activeIdx === segIdx,
            materialType: row.materialType,
            materialSubType: row.materialSubType,
            _subRowId: `subrow-${row.index}-${segIdx}`,
          });
        });
      }
    });
    return result;
  }, [rowsWithType, processedRows, activeSubRows]);

  const expWtRatioSum = typeof totalExpWtRatio === 'number' ? totalExpWtRatio : 0;
  const showWarning = expWtRatioSum > 0 && Math.abs(expWtRatioSum - 100) > 0.001;

  // Rebuild column defs when warning state changes so the header component updates
  const columnDefs = useMemo(
    () => buildCompositionColumnDefs(
      onFieldChange,
      handleProcess,
      handleSetActiveSubRow,
      handleSubRowStoichChange,
      handleSubRowCalcWtChange,
      handleSubRowExpWtChange,
      showWarning,
      expWtRatioSum,
    ),
    [onFieldChange, handleProcess, handleSetActiveSubRow, handleSubRowStoichChange, handleSubRowCalcWtChange, handleSubRowExpWtChange, showWarning, expWtRatioSum],
  );

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

  if (!mounted) return null;

  return (
    <>
      <h5 className="mt-3 d-flex align-items-center gap-2">
        Composition table:
        {showWarning && (
          <span className="badge bg-warning text-dark">
            {`⚠ Exp. wt. ratio sum = ${expWtRatioSum.toFixed(1)} (expected 100)`}
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
