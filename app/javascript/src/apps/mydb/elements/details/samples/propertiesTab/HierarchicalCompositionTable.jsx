import React, {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import PropTypes from 'prop-types';
import { Form } from 'react-bootstrap';
import { AgGridReact } from 'ag-grid-react';
import buildHierarchicalMaterialRows, { rescaleSegmentCalcWt } from 'src/utilities/sampleHierarchicalCompositions';
import {
  parseFormulaLabel,
  parseFormulaToElements,
  getMaterialTypeSync,
  computeEffectiveWt,
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

// Type column renderer: shows material type for parent rows, active checkbox for sub-rows (children).
const TypeCellRenderer = ({ data, onSetActive }) => {
  if (data?.isSubRow) {
    const tooltip = data.isActive
      ? `${data.element} is marked as active — it is included in the highlighted element set for this compound. Click to deselect.`
      : `Mark ${data.element} as active to include it in the highlighted element set for this compound. Multiple elements can be selected.`;
    return (
      <div className="d-flex align-items-center justify-content-center h-100" title={tooltip}>
        <Form.Check
          type="checkbox"
          checked={!!data.isActive}
          className="m-1"
          onChange={() => {}}
          onClick={(e) => { e.stopPropagation(); onSetActive(data.parentIndex, data.segIdx); }}
        />
      </div>
    );
  }
  return <span>{data?.materialType ?? ''}</span>;
};

TypeCellRenderer.propTypes = {
  data: PropTypes.object,
  onSetActive: PropTypes.func.isRequired,
};

TypeCellRenderer.defaultProps = {
  data: null,
};

// CSS-drawn chevron — crisp at any size, no font rendering variance.
const Chevron = ({ dir }) => <span className={`hm-chevron hm-chevron--${dir}`} />;
Chevron.propTypes = { dir: PropTypes.oneOf(['right', 'down']).isRequired };

// Dedicated action column renderer — expand / collapse / process.
// Lives in a narrow first column so the Components cell stays clean text only.
// Reload is always visible for expandable rows; toggle only appears after processing.
const ExpandActionCellRenderer = ({ data, onProcess, onToggleCollapse }) => {
  if (data?.isSubRow) return null;
  // Spec: support materials do not need element-level expansion
  if (data?.materialType === 'Support') return null;

  const isCollapsed = data?.isCollapsed;
  return (
    <div className="hm-expand-cell">
      {data?.isProcessed && (
        <button
          type="button"
          className={`hm-action-btn ${isCollapsed ? 'hm-action-btn--collapsed' : 'hm-action-btn--expanded'}`}
          title={isCollapsed ? 'Show element breakdown' : 'Hide element breakdown'}
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(data.index); }}
        >
          <Chevron dir={isCollapsed ? 'right' : 'down'} />
        </button>
      )}
      <button
        type="button"
        className="hm-reprocess-btn"
        title="Process and expand element breakdown"
        onClick={(e) => { e.stopPropagation(); onProcess(data); }}
      >
        <span className="hm-reload-icon" />
      </button>
    </div>
  );
};

ExpandActionCellRenderer.propTypes = {
  data: PropTypes.object,
  onProcess: PropTypes.func.isRequired,
  onToggleCollapse: PropTypes.func.isRequired,
};

ExpandActionCellRenderer.defaultProps = {
  data: null,
};

// A1: Label-only renderer for the Components column.
// shows "└ Element (parentFormula)" for element-level sub-rows.
function ComponentsCellRenderer({ data }) {
  if (data?.isSubRow) {
    if (data.unknown) {
      return (
        <span
          className="ps-3 fst-italic text-danger"
          title={`'${data.element}' not recognised — check capitalisation (e.g. 'PtPd' not 'ptpd')`}
        >
          {data.element}
          {' ⚠'}
        </span>
      );
    }
    return (
      <span className="ps-3 fst-italic" style={{ color: '#3d5a80' }}>
        {data.element}
      </span>
    );
  }
  return (
    <span className="text-truncate d-block w-100" title={data?.sourceAlias ?? ''}>
      {data?.sourceAlias ?? ''}
    </span>
  );
}

ComponentsCellRenderer.propTypes = {
  data: PropTypes.object,
};

ComponentsCellRenderer.defaultProps = {
  data: null,
};

// A2: Custom header for the "Exp. wt. ratio" column.
// Shows a ⚠ icon when the sum deviates from 100; tooltip explains current value.
function ExpWtRatioHeader({ displayName, showWarning, warningMessage }) {
  const tooltip = showWarning
    ? `⚠ ${warningMessage}`
    : 'Experimental weight ratio — enter values on sub-rows or on the parent row';
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
  warningMessage: PropTypes.string,
};

ExpWtRatioHeader.defaultProps = {
  displayName: 'Exp. wt. ratio',
  showWarning: false,
  warningMessage: '',
};

const buildCompositionColumnDefs = (
  onFieldChange,
  onProcess,
  onToggleCollapse,
  onSetActive,
  onSubRowStoichChange,
  onSubRowCalcWtChange,
  onSubRowExpWtChange,
  onParentCalcWtChange,
  showCalcWarning,
  calcWarningMessage,
  showWarning,
  warningMessage,
) => [
  {
    // Dedicated expand/collapse/process action column — keeps Components label clean
    headerName: '',
    field: 'expand_action',
    width: 64,
    minWidth: 64,
    maxWidth: 64,
    suppressSizeToFit: true,
    suppressClickEdit: true,
    suppressCellFocus: true,
    cellClass: ['border-end', 'p-0'],
    cellRenderer: ExpandActionCellRenderer,
    cellRendererParams: { onProcess, onToggleCollapse },
    valueGetter: (p) => {
      if (p.data?.isSubRow) return 'none';
      if (p.data?.materialType === 'Support') return 'none';
      if (!p.data?.isProcessed) return 'unprocessed';
      return p.data?.isCollapsed ? 'collapsed' : 'expanded';
    },
  },
  {
    // A3: Type text for parent rows; active-element radio for sub-rows (replaces removed Active column)
    headerName: 'Type',
    field: 'materialType',
    minWidth: 90,
    maxWidth: 110,
    headerTooltip: 'Material type for parent rows. Radio to mark the active element for sub-rows.',
    suppressClickEdit: true,
    cellClass: (p) => ['lh-base', 'border-end', p.data?.isSubRow ? 'p-0' : ''],
    cellRenderer: TypeCellRenderer,
    cellRendererParams: { onSetActive },
    valueGetter: (p) => (p.data?.isSubRow ? (p.data?.isActive ? '1' : '0') : (p.data?.materialType ?? '')),
    tooltipValueGetter: (p) => {
      if (p.data?.isSubRow) return null;
      const sub = p.data?.materialSubType;
      if (!sub || sub === p.data?.materialType || sub === 'Unknown') return null;
      return sub;
    },
  },
  {
    // A1: label-only — action buttons live in the dedicated expand column
    headerName: 'Components',
    field: 'sourceAlias',
    minWidth: 120,
    headerTooltip: 'Label from the canvas text node attached to this shape',
    cellStyle: { overflow: 'hidden' },
    cellClass: (p) => ['lh-base', 'border-end', p.data?.isSubRow ? '' : 'px-1'],
    cellRenderer: ComponentsCellRenderer,
    // valueGetter gives AG Grid a trackable value for sub-rows; without it, AG Grid sees
    // sourceAlias=undefined before and after re-process and skips cell refresh entirely,
    // leaving the ⚠ visible even after unknown:true→false correction.
    valueGetter: (p) => {
      if (p.data?.isSubRow) return `${p.data?.element ?? ''}:${p.data?.unknown ? '1' : '0'}`;
      return p.data?.sourceAlias ?? '';
    },
  },
  {
    // Mode B entry point: editing calcWt back-calculates stoich for sub-rows; encodes override in source for parent rows
    headerName: 'Calc. wt.%',
    field: 'weightRatioCalcProcessed',
    minWidth: 110,
    headerComponent: ExpWtRatioHeader,
    headerComponentParams: { showWarning: showCalcWarning, warningMessage: calcWarningMessage },
    editable: true,
    cellClass: () => ['editable-cell border-end'],
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
      } else {
        const val = parseFloat(params.newValue);
        if (Number.isFinite(val) && val >= 0) {
          const rawSource = params.data.sourceAlias || '';
          const stripped = rawSource.replace(/^\d+\.?\d*\s*(?:wt\.?%|%)\s*/i, '').trim();
          const newSource = val > 0 ? `${val}% ${stripped}` : stripped;
          onParentCalcWtChange(params.data.index, val, newSource);
        }
      }
      return false;
    },
  },
  {
    // A2: custom header with live ⚠ warning icon
    headerName: 'Exp. wt.%',
    field: 'weight_ratio_exp',
    editable: true,
    cellClass: () => ['editable-cell border-end'],
    minWidth: 110,
    headerComponent: ExpWtRatioHeader,
    headerComponentParams: { showWarning, warningMessage },
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
    // Read-only for processed parent rows — MM is controlled by sub-row stoich × atomicMass
    editable: (p) => !p.data?.isSubRow && !p.data?.isProcessed,
    headerTooltip: 'Molar mass in g/mol — atomic mass for element rows, compound mass for parent rows. Read-only after processing (edit sub-row stoich to change).',
    cellClass: (p) => [p.data?.isSubRow || p.data?.isProcessed ? 'border-end' : 'editable-cell border-end'],
    minWidth: 110,
    valueSetter: (params) => {
      if (params.newValue != null && !params.data?.isSubRow && !params.data?.isProcessed) {
        onFieldChange(params.data.index, 'molar_mass', params.newValue);
      }
      return false;
    },
    valueGetter: (p) => {
      const raw = p.data?.isSubRow ? p.data?.atomicMass : p.data?.molar_mass;
      if (raw == null || raw === '') return '';
      const num = parseFloat(raw);
      return Number.isNaN(num) ? raw : parseFloat(num.toFixed(3));
    },
  },
  {
    // Calc. mol. ratio column — shows stoichiometry for element sub-rows (editable),
    // and the parent-level calc molar ratio for parent rows.
    headerName: 'Calc. mol ratio / Stoich.',
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
    headerName: 'Calc. mol%',
    field: 'calcMolPercent',
    minWidth: 110,
    headerTooltip: 'Calc. mol ratio of this element / Σ(Calc. mol ratio of ALL elements)',
    valueGetter: (p) => p.data?.calcMolPercent ?? '-',
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Exp. mol ratio',
    field: 'expMolRatio',
    minWidth: 110,
    headerTooltip: 'Exp. wt. ratio / molar mass',
    valueGetter: (p) => p.data?.expMolRatio ?? '-',
    cellClass: ['lh-base', 'border-end'],
  },
  {
    headerName: 'Exp. mol%',
    field: 'expMolPercent',
    minWidth: 110,
    headerTooltip: 'Exp. mol ratio of this element / Σ(Exp. mol ratio of ALL elements)',
    valueGetter: (p) => p.data?.expMolPercent ?? '-',
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
  // Set of parent row indices whose sub-rows are currently collapsed
  const [collapsedRows, setCollapsedRows] = useState(new Set());
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

  // Reset sub-row state only when the components list itself changes (added/removed/reordered),
  // not on every parent re-render that produces a new array reference.
  const componentsKey = useMemo(
    () => (components || []).map((c) => `${c.index}:${c.sourceAlias}`).join('|'),
    [components],
  );
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setProcessedRows({});
    setActiveSubRows({});
    setCollapsedRows(new Set());
  }, [componentsKey]); // eslint-disable-line react-hooks/exhaustive-deps
  /* eslint-enable react-hooks/set-state-in-effect */

  // A4 (revised): Parse the label into element-level sub-rows.
  // For each formula segment (split by "/"), decompose into constituent elements.
  // Fetch atomic masses via the existing molecular-mass service.
  // calcWt for each element = segCalcWt × (stoich × atomicMass) / Σ(stoich_i × MM_i)
  const handleProcess = useCallback(async (rowData) => {
    const segments = parseFormulaLabel(rowData.sourceAlias);

    // Fetch segment-level compound masses to split effectiveWt across "/" segments
    const segMasses = await Promise.all(
      segments.map((seg) => MoleculesFetcher.calculateMolecularMassFromSumFormula(seg.segment)
        .catch(() => null)),
    );
    const totalSegMass = segMasses.reduce((s, m) => s + (m || 0), 0);

    // A7: auto-fill molar_mass for single-compound labels when the field is currently blank
    if (segments.length === 1 && segMasses[0] && !(parseFloat(rowData.molar_mass) > 0)) {
      onFieldChange(rowData.index, 'molar_mass', parseFloat(segMasses[0].toFixed(3)));
    }

    const allSubRows = [];

    // Always distribute sub-rows from the displayed parent calc wt% — the single source of truth.
    // Label text % is ignored: the displayed value already reflects Ketcher assignment,
    // calcWeightRatioWithoutWeight fallback, or any user edit to the parent cell.
    const effectiveWt = computeEffectiveWt(rowData);

    for (let si = 0; si < segments.length; si += 1) {
      const seg = segments[si];
      const segMass = segMasses[si];

      // Portion of effectiveWt allocated to this "/" segment
      const segCalcWt = effectiveWt !== null && segMass != null && totalSegMass > 0
        ? effectiveWt * segMass / totalSegMass
        : effectiveWt;

      const elemCounts = parseFormulaToElements(seg.segment);

      // Detect unrecognised characters left after element matching (e.g. "ptpd" in "O2ptpd").
      // Add them as a single unknown entry so they appear as a sub-row rather than vanishing.
      const unrecognised = seg.segment.replace(/([A-Z][a-z]?)(\d*\.?\d*)/g, '').replace(/\s/g, '');
      if (unrecognised) elemCounts.push({ element: unrecognised, count: 1, unknown: true });

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

      elemCounts.forEach(({ element, count, unknown: isUnknown }, i) => {
        const atomicMass = atomicMasses[i];
        // Unknown tokens (e.g. "ptpd") have null atomicMass → calcWt stays null/empty.
        // Known elements still get their proportional share from the recognised mass fraction.
        const calcWt = atomicMass && elemTotalMass > 0 && segCalcWt != null
          ? +((count * atomicMass / elemTotalMass * segCalcWt).toFixed(3))
          : null;
        allSubRows.push({
          element,
          stoich: count,
          atomicMass: atomicMass ?? null,
          calcWt,
          expWt: 0,
          segmentFormula: seg.segment,
          segmentCalcWt: segCalcWt,
          unknown: isUnknown || false,
        });
      });
    }

    // Sync molar_mass to Σ(stoich × atomicMass) — more accurate than the compound-level
    // mass service, and keeps the displayed field consistent with what mol% calculations use.
    const effectiveMM = allSubRows.reduce(
      (s, sr) => s + (parseFloat(sr.stoich) || 0) * (sr.atomicMass || 0), 0,
    );
    if (effectiveMM > 0) {
      onFieldChange(rowData.index, 'molar_mass', parseFloat(effectiveMM.toFixed(3)));
    }

    setProcessedRows((prev) => ({ ...prev, [rowData.index]: allSubRows }));
    // Auto-expand the row after (re-)processing so sub-rows are immediately visible
    setCollapsedRows((prev) => { const next = new Set(prev); next.delete(rowData.index); return next; });
  }, [onFieldChange]);

  // Bidirectional calc: user edits stoich → recalculate calcWt for all elements in that segment.
  // Also syncs the parent compound's molar_mass to Σ(stoich_i × MM_i) so calc mol% stays correct.
  const handleSubRowStoichChange = useCallback((parentIndex, segIdx, newStoich) => {
    let effectiveMM = 0;
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
          calcWt: +((r.stoich * r.atomicMass / groupTotalMass * (segmentCalcWt ?? 0)).toFixed(3)),
        };
      });

      // Capture effective compound MM for the onFieldChange call below
      effectiveMM = updated.reduce((s, r) => s + (parseFloat(r.stoich) || 0) * (r.atomicMass || 0), 0);
      return { ...prev, [parentIndex]: updated };
    });
    if (effectiveMM > 0) onFieldChange(parentIndex, 'molar_mass', parseFloat(effectiveMM.toFixed(3)));
  }, [onFieldChange]);

  // Mode B: user edits calcWt → rescale other elements in the segment so sum stays
  // locked to segmentCalcWt, then back-calculate stoich for all elements in the segment.
  // stoich_i = (calcWt_i / MM_i) / min(calcWt_j / MM_j) — normalized so smallest = 1.
  // Also syncs the parent compound's molar_mass to Σ(stoich_i × MM_i).
  const handleSubRowCalcWtChange = useCallback((parentIndex, segIdx, newCalcWt) => {
    let effectiveMM = 0;
    setProcessedRows((prev) => {
      const rows = prev[parentIndex] || [];
      if (!rows[segIdx]) return prev;

      // Rescale all elements in the segment so Σ calcWt = segmentCalcWt
      const rescaled = rescaleSegmentCalcWt(rows, segIdx, newCalcWt);

      const { segmentFormula } = rescaled[segIdx];
      const groupIndices = rescaled.reduce((acc, r, i) => {
        if (r.segmentFormula === segmentFormula) acc.push(i);
        return acc;
      }, []);

      // Back-calculate stoich from new calcWt values
      const mols = groupIndices.map((i) => {
        const r = rescaled[i];
        return r.atomicMass && r.atomicMass > 0 && r.calcWt > 0
          ? r.calcWt / r.atomicMass
          : 0;
      });
      const minMol = Math.min(...mols.filter((m) => m > 0));

      const updated = [...rescaled];
      if (minMol > 0 && Number.isFinite(minMol)) {
        groupIndices.forEach((ri, gi) => {
          updated[ri] = { ...updated[ri], stoich: +(mols[gi] / minMol).toFixed(3) };
        });
      }

      effectiveMM = updated.reduce((s, r) => s + (parseFloat(r.stoich) || 0) * (r.atomicMass || 0), 0);
      return { ...prev, [parentIndex]: updated };
    });
    if (effectiveMM > 0) onFieldChange(parentIndex, 'molar_mass', parseFloat(effectiveMM.toFixed(3)));
  }, [onFieldChange]);

  const handleSubRowExpWtChange = useCallback((parentIndex, segIdx, value) => {
    setProcessedRows((prev) => {
      const rows = [...(prev[parentIndex] || [])];
      if (!rows[segIdx]) return prev;
      rows[segIdx] = { ...rows[segIdx], expWt: value };
      return { ...prev, [parentIndex]: rows };
    });
  }, []);

  // Parent row Calc. wt.% edit: encode new weight in source and proportionally rescale sub-rows
  const handleParentCalcWtChange = useCallback((parentIndex, newWt, newSource) => {
    onFieldChange(parentIndex, 'source', newSource);
    setProcessedRows((prev) => {
      const rows = prev[parentIndex];
      if (!rows || rows.length === 0) return prev;
      const oldTotal = rows.reduce((s, r) => s + (parseFloat(r.calcWt) || 0), 0);
      if (oldTotal <= 0) return prev;
      const scale = newWt / oldTotal;
      const scaled = rows.map((r) => ({
        ...r,
        calcWt: r.calcWt != null ? parseFloat((r.calcWt * scale).toFixed(3)) : r.calcWt,
        segmentCalcWt: r.segmentCalcWt != null
          ? parseFloat((r.segmentCalcWt * scale).toFixed(3))
          : r.segmentCalcWt,
      }));
      return { ...prev, [parentIndex]: scaled };
    });
  }, [onFieldChange]);

  // Radio-select: one active sub-row per parent. Clicking again deselects.
  const handleSetActiveSubRow = useCallback((parentIndex, segIdx) => {
    setActiveSubRows((prev) => {
      const current = new Set(prev[parentIndex] || []);
      if (current.has(segIdx)) { current.delete(segIdx); } else { current.add(segIdx); }
      return { ...prev, [parentIndex]: current };
    });
  }, []);

  // Toggle collapse/expand for a processed parent row (does not clear its sub-row data).
  const handleToggleCollapse = useCallback((parentIndex) => {
    setCollapsedRows((prev) => {
      const next = new Set(prev);
      if (next.has(parentIndex)) { next.delete(parentIndex); } else { next.add(parentIndex); }
      return next;
    });
  }, []);

  const { rowsData, totalExpWtRatio } = useMemo(
    () => buildHierarchicalMaterialRows(components),
    [components],
  );
  const baseRows = Array.isArray(rowsData) ? rowsData : [];

  // A3: Attach both materialType (short) and materialSubType (full sub-tab label)
  const rowsWithType = useMemo(() => baseRows.map((row) => {
    const { type, subType } = getMaterialTypeSync(row.template_id, shapesJson);
    return { ...row, materialType: type, materialSubType: subType };
  }), [baseRows, shapesJson]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fill molar_mass for single-compound rows where the field is blank.
  // Runs on load and whenever the row list changes. Never overwrites a user-entered value.
  // Skips "/" mixtures (no single compound mass) and unrecognised formulas.
  useEffect(() => {
    rowsWithType.forEach((row) => {
      if (parseFloat(row.molar_mass) > 0) return;
      const segments = parseFormulaLabel(row.sourceAlias);
      if (segments.length !== 1) return;
      MoleculesFetcher.calculateMolecularMassFromSumFormula(segments[0].segment)
        .then((mm) => { if (mm) onFieldChange(row.index, 'molar_mass', parseFloat(mm.toFixed(3))); })
        .catch(() => {});
    });
  }, [rowsWithType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inject element-level sub-rows after each processed parent row; flag parent as processed.
  // Two-pass: first accumulate global mol totals, then build the row array with mol% attached.
  const gridRowData = useMemo(() => {
    // Pass 1 — global mol totals.
    // totalCompoundCalcMol: Σ(calc_wt/effectiveMM) — denominator for Calc. mol%.
    //   For expanded rows, effectiveMM = Σ(stoich_i × MM_i) from sub-rows (accurate even when
    //   the molar_mass field lags behind stoich edits). For unexpanded, uses molar_mass field.
    // totalExpMol: element-level for expanded rows, compound-level for unexpanded rows.
    let totalCompoundCalcMol = 0;
    let totalExpMol = 0;
    rowsWithType.forEach((row) => {
      const mm = parseFloat(row.molar_mass) || 0;
      const subRows = processedRows[row.index];
      if (subRows) {
        const effectiveMM = subRows.reduce(
          (s, sr) => s + (parseFloat(sr.stoich) || 0) * (sr.atomicMass || 0), 0,
        );
        const compMM = effectiveMM > 0 ? effectiveMM : mm;
        if (compMM > 0) totalCompoundCalcMol += (parseFloat(row.weightRatioCalcProcessed) || 0) / compMM;
        subRows.forEach((sr) => {
          if (sr.atomicMass > 0) totalExpMol += (parseFloat(sr.expWt) || 0) / sr.atomicMass;
        });
      } else if (mm > 0) {
        totalCompoundCalcMol += (parseFloat(row.weightRatioCalcProcessed) || 0) / mm;
        totalExpMol += (parseFloat(row.weight_ratio_exp) || 0) / mm;
      }
    });

    // Pass 2 — build flat result array, attaching calcMolPercent / expMolRatio / expMolPercent.
    // Calc. mol% uses compound-level denominator distributed by stoich fraction for sub-rows.
    const result = [];
    rowsWithType.forEach((row) => {
      const subRows = processedRows[row.index];

      // Count unique elements for isSingleElement guard (hides process button for single elements)
      const segments = parseFormulaLabel(row.sourceAlias);
      const uniqueElements = new Set(
        segments.flatMap((seg) => parseFormulaToElements(seg.segment).map((e) => e.element)),
      );
      const totalElements = uniqueElements.size;

      const mm = parseFloat(row.molar_mass) || 0;

      if (subRows) {
        const isCollapsed = collapsedRows.has(row.index);
        const stoichSum = subRows.reduce((s, sr) => s + (parseFloat(sr.stoich) || 0), 0);

        // Use stoich-derived compound MM so calc mol% is correct after stoich edits
        const effectiveMM = subRows.reduce(
          (s, sr) => s + (parseFloat(sr.stoich) || 0) * (sr.atomicMass || 0), 0,
        );
        const compMM = effectiveMM > 0 ? effectiveMM : mm;
        const compoundCalcMol = compMM > 0 ? (parseFloat(row.weightRatioCalcProcessed) || 0) / compMM : 0;
        // Keep full-precision intermediate — rounding before sub-row multiplication compounds error
        const compoundCalcMolPctRaw = totalCompoundCalcMol > 0
          ? compoundCalcMol / totalCompoundCalcMol * 100
          : 0;
        const parentCalcMolPct = compoundCalcMolPctRaw > 0
          ? parseFloat(compoundCalcMolPctRaw.toFixed(4))
          : '-';

        let parentExpMol = 0;
        subRows.forEach((sr) => {
          if (sr.atomicMass > 0) {
            parentExpMol += (parseFloat(sr.expWt) || 0) / sr.atomicMass;
          }
        });

        result.push({
          ...row,
          isProcessed: true,
          isCollapsed,
          isSingleElement: totalElements <= 1,
          molarRatioCalcMM: compMM > 0 ? parseFloat(((parseFloat(row.weightRatioCalcProcessed) || 0) / compMM).toFixed(4)) : '-',
          calcMolPercent: parentCalcMolPct,
          expMolRatio: parseFloat(parentExpMol.toFixed(4)),
          expMolPercent: totalExpMol > 0 ? parseFloat((parentExpMol / totalExpMol * 100).toFixed(4)) : '-',
        });

        if (!isCollapsed) {
          const activeSet = new Set(activeSubRows[row.index] || []);
          subRows.forEach((sr, segIdx) => {
            const stoich = parseFloat(sr.stoich) || 0;
            const elExpMol = sr.atomicMass > 0 ? (parseFloat(sr.expWt) || 0) / sr.atomicMass : 0;
            // Sub-row Calc. mol% = parent compound mol% × stoich / stoichSum
            // Use full-precision raw value to avoid compounding rounding from intermediate
            const subCalcMolPct = stoichSum > 0 && compoundCalcMolPctRaw > 0
              ? parseFloat((compoundCalcMolPctRaw * stoich / stoichSum).toFixed(4))
              : '-';
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
              isActive: activeSet.has(segIdx),
              unknown: sr.unknown || false,
              materialType: row.materialType,
              materialSubType: row.materialSubType,
              _subRowId: `subrow-${row.index}-${segIdx}`,
              calcMolPercent: subCalcMolPct,
              expMolRatio: sr.atomicMass > 0 ? parseFloat(elExpMol.toFixed(4)) : '-',
              expMolPercent: totalExpMol > 0 ? parseFloat((elExpMol / totalExpMol * 100).toFixed(4)) : '-',
            });
          });
        }
      } else {
        const compoundCalcMol = mm > 0 ? (parseFloat(row.weightRatioCalcProcessed) || 0) / mm : 0;
        const unexpandedCalcMolPct = totalCompoundCalcMol > 0
          ? parseFloat((compoundCalcMol / totalCompoundCalcMol * 100).toFixed(4))
          : '-';
        const compExpMol = mm > 0 ? (parseFloat(row.weight_ratio_exp) || 0) / mm : 0;
        result.push({
          ...row,
          isProcessed: false,
          isSingleElement: totalElements <= 1,
          calcMolPercent: unexpandedCalcMolPct,
          expMolRatio: mm > 0 ? parseFloat(compExpMol.toFixed(4)) : '-',
          expMolPercent: totalExpMol > 0 ? parseFloat((compExpMol / totalExpMol * 100).toFixed(4)) : '-',
        });
      }
    });
    // Sort: single-element rows (no process button) float to the top.
    // Must sort groups (parent + its sub-rows) as units so sub-rows stay with their parent.
    const groups = [];
    let cur = null;
    result.forEach((row) => {
      if (row.isSubRow) { cur.push(row); } else { cur = [row]; groups.push(cur); }
    });
    groups.sort((a, b) => (a[0].isSingleElement ? 0 : 1) - (b[0].isSingleElement ? 0 : 1));
    return groups.flat();
  }, [rowsWithType, processedRows, activeSubRows, collapsedRows]);

  // Calc. wt.% warning: parent rows don't sum to 100
  const calcWtSum = parseFloat(
    baseRows.reduce((s, row) => s + (parseFloat(row.weightRatioCalcProcessed) || 0), 0).toFixed(1),
  );
  const showCalcWarning = baseRows.length > 0 && Math.abs(calcWtSum - 100) > 0.001;
  const calcWarningMessage = showCalcWarning
    ? `Calc. wt.% sum = ${calcWtSum} (expected 100)`
    : '';

  // Warning 1: sub-row exp wt has been entered but doesn't sum to parent exp wt
  let subRowWarning = false;
  let subRowWarningMsg = '';
  baseRows.forEach((row) => {
    const subRows = processedRows[row.index];
    if (!subRows || subRows.length === 0) return;
    const anyFilled = subRows.some((sr) => parseFloat(sr.expWt) > 0);
    if (!anyFilled) return; // user hasn't entered sub-row exp wt yet — don't warn
    const subExpSum = parseFloat(
      subRows.reduce((s, sr) => s + (parseFloat(sr.expWt) || 0), 0).toFixed(1),
    );
    const parentExpWt = parseFloat(row.weight_ratio_exp) || 0;
    if (parentExpWt > 0 && Math.abs(subExpSum - parentExpWt) > 0.1) {
      subRowWarning = true;
      subRowWarningMsg = `Sub-row exp. wt. sum (${subExpSum}) ≠ parent (${parentExpWt.toFixed(1)})`;
    }
  });

  // Warning 2: global sum of all parent exp wt should total 100
  const globalExpWtSum = typeof totalExpWtRatio === 'number' ? totalExpWtRatio : 0;
  const globalWarning = baseRows.length > 0 && Math.abs(globalExpWtSum - 100) > 0.001;
  const globalWarningMsg = globalWarning
    ? `Exp. wt. ratio sum = ${globalExpWtSum.toFixed(1)} (expected 100)`
    : '';

  const showWarning = subRowWarning || globalWarning;
  const warningMessage = [subRowWarningMsg, globalWarningMsg].filter(Boolean).join(' · ');

  // Rebuild column defs when warning state changes so the header component updates
  const columnDefs = useMemo(
    () => buildCompositionColumnDefs(
      onFieldChange,
      handleProcess,
      handleToggleCollapse,
      handleSetActiveSubRow,
      handleSubRowStoichChange,
      handleSubRowCalcWtChange,
      handleSubRowExpWtChange,
      handleParentCalcWtChange,
      showCalcWarning,
      calcWarningMessage,
      showWarning,
      warningMessage,
    ),
    // eslint-disable-next-line max-len
    [onFieldChange, handleProcess, handleToggleCollapse, handleSetActiveSubRow, handleSubRowStoichChange, handleSubRowCalcWtChange, handleSubRowExpWtChange, handleParentCalcWtChange, showCalcWarning, calcWarningMessage, showWarning, warningMessage],
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
    if (params.data?.isSubRow) return 'composition-sub-row';
    return 'composition-parent-row';
  }, []);

  if (!mounted) return null;

  return (
    <>
      <h5 className="mt-3 d-flex align-items-center gap-2">
        Composition table:
        {showCalcWarning && (
          <span className="badge bg-warning text-dark">
            {`⚠ ${calcWarningMessage}`}
          </span>
        )}
        {showWarning && (
          <span className="badge bg-warning text-dark">
            {`⚠ ${warningMessage}`}
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
          rowHeight={32}
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
