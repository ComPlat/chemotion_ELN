import React, {
  useCallback, useEffect, useMemo, useRef,
} from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';

import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';

import useCompareSpectra, { COMPARE_STATUS } from '../hooks/useCompareSpectra';
import useSpectraStoreSlice from '../hooks/useSpectraStoreSlice';
import { resolveSelection } from '../utils/compareSelectionTree';
import { cleanLayoutLabel } from '../utils/containerLayout';
import CompareSpectraHeader from './CompareSpectraHeader';
import CompareSpectraBody, { formatPksOps, formatMpyOps } from './CompareSpectraBody';

const selectModalSlice = (state) => ({
  showCompareModal: state.showCompareModal,
  storeContainer: state.container,
});

const resolveActiveContainer = (sample, preferred) => {
  const preferredId = preferred?.id;
  if (!sample || typeof sample.analysisContainers !== 'function') return preferred;
  const list = sample.analysisContainers() || [];
  if (preferredId) {
    const found = list.find((c) => c.id === preferredId);
    if (found) return found;
  }
  return preferred || sample?.container || null;
};

const computeNextContainerFromSelection = (container, selection) => {
  if (!container) return container;
  const layoutLabel = cleanLayoutLabel(selection?.[0]?.layout);
  return {
    ...container,
    extended_metadata: {
      ...(container.extended_metadata || {}),
      analyses_compared: selection,
      kind: layoutLabel || container.extended_metadata?.kind || null,
    },
  };
};

const writeContentOps = (container, ops) => {
  if (!container) return container;
  const existing = container.extended_metadata?.content;
  const currentOps = Array.isArray(existing?.ops) ? [...existing.ops] : [{ insert: '\n' }];
  let nextOps = [...currentOps, ...ops];
  if (nextOps[0]?.insert === '\n' && nextOps.length > 1) nextOps = nextOps.slice(1);
  return {
    ...container,
    extended_metadata: {
      ...(container.extended_metadata || {}),
      content: { ops: nextOps },
    },
  };
};

const replaceContent = (container, content) => {
  if (!container) return container;
  const nextContent = content?.ops
    ? content
    : { ops: Array.isArray(content) ? content : [{ insert: '\n' }] };
  return {
    ...container,
    extended_metadata: {
      ...(container.extended_metadata || {}),
      content: nextContent,
    },
  };
};

const buildSavePayloads = (params) => {
  const list = Array.isArray(params?.spectra_list) ? params.spectra_list : [];
  return list.length > 0 ? list : [params];
};

const resolveWriteParams = (params) => {
  const payloads = buildSavePayloads(params);
  const fallbackCurveIdx = params?.curveSt?.curveIdx ?? 0;
  const payload = payloads[fallbackCurveIdx] || payloads[0] || {};
  const curveIdx = payload?.curveSt?.curveIdx ?? payload?.curveIdx ?? fallbackCurveIdx;

  return {
    peaks: payload?.peaks,
    shift: payload?.shift,
    layout: payload?.layout,
    isAscend: payload?.isAscend,
    decimal: payload?.decimal ?? 2,
    body: payload?.body,
    isIntensity: payload?.isIntensity,
    integration: payload?.integration,
    multiplicity: payload?.multiplicity,
    waveLength: payload?.waveLength,
    curveSt: { curveIdx },
  };
};

const CompareSpectraModal = ({
  sample,
  onContainerChange,
  onSampleChanged,
  onSubmit,
}) => {
  const { showCompareModal, storeContainer } = useSpectraStoreSlice(selectModalSlice);

  const activeContainer = useMemo(
    () => resolveActiveContainer(sample, storeContainer || sample?.container),
    [sample, storeContainer],
  );

  const compare = useCompareSpectra({
    sample,
    container: showCompareModal ? activeContainer : null,
  });
  const compareRef = useRef(compare);

  useEffect(() => {
    compareRef.current = compare;
  }, [compare]);

  const setCurrentContainer = useCallback((nextContainer) => {
    compareRef.current = {
      ...compareRef.current,
      container: nextContainer,
    };
    compareRef.current.setContainer(nextContainer);
  }, []);

  const close = useCallback(() => {
    SpectraActions.ToggleCompareModal.defer(null);
  }, []);

  useEffect(() => {
    if (!showCompareModal) compare.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCompareModal]);

  const handleSelectionChange = useCallback((treeData, selectedFiles, info) => {
    const currentCompare = compareRef.current;
    if (!currentCompare.container) return;
    const selection = resolveSelection({
      treeData,
      selectedFiles,
      info,
    });
    const nextContainer = computeNextContainerFromSelection(currentCompare.container, selection);
    setCurrentContainer(nextContainer);
  }, [setCurrentContainer]);

  const handleUndo = useCallback(() => {
    const next = compareRef.current.undo();
    if (next) {
      compareRef.current = {
        ...compareRef.current,
        container: next,
      };
    }
  }, []);

  const persistOps = useCallback(async (params, opsToWrite = null) => {
    const currentCompare = compareRef.current;
    if (!currentCompare.container) return;
    LoadingActions.start.defer();
    let containerForSave = currentCompare.container;
    if (Array.isArray(opsToWrite) && opsToWrite.length > 0) {
      containerForSave = writeContentOps(currentCompare.container, opsToWrite);
      setCurrentContainer(containerForSave);
    }

    try {
      const payloads = buildSavePayloads(params);
      const result = await compareRef.current.persist({
        payloads,
        frontCurveIdx: params?.curveSt?.curveIdx ?? 0,
        container: containerForSave,
      });
      if (result?.container) {
        compareRef.current = {
          ...compareRef.current,
          container: result.container,
        };
        onContainerChange?.(result.container, () => onSubmit?.());
      } else {
        onSubmit?.();
      }
    } catch {
      // swallow: persist already dispatched SAVE_FAIL into the hook state
    } finally {
      LoadingActions.stop.defer();
    }
  }, [onContainerChange, onSubmit, setCurrentContainer]);

  const handleSave = useCallback((params) => persistOps(params), [persistOps]);
  const handleSaveClose = useCallback(async (params) => {
    await persistOps(params);
    close();
  }, [persistOps, close]);

  const buildWriteOps = useCallback((params, isMpy) => {
    const resolved = resolveWriteParams(params);
    if (!resolved.layout) return [];
    const curveIdx = resolved.curveSt.curveIdx ?? 0;
    const { multiEntities } = compareRef.current;
    const entity = multiEntities?.[curveIdx] || multiEntities?.[0];
    if (!entity) return [];
    return isMpy ? formatMpyOps({ entity, ...resolved }) : formatPksOps({ entity, ...resolved });
  }, []);

  const handleWritePeak = useCallback((params) => persistOps(params, buildWriteOps(params, false)), [persistOps, buildWriteOps]);
  const handleWriteMpy = useCallback((params) => persistOps(params, buildWriteOps(params, true)), [persistOps, buildWriteOps]);
  const handleWriteClosePeak = useCallback(async (params) => {
    await persistOps(params, buildWriteOps(params, false));
    close();
  }, [persistOps, buildWriteOps, close]);
  const handleWriteCloseMpy = useCallback(async (params) => {
    await persistOps(params, buildWriteOps(params, true));
    close();
  }, [persistOps, buildWriteOps, close]);

  const handleDescriptionChanged = useCallback((content) => {
    const currentCompare = compareRef.current;
    if (!currentCompare.container) return;
    const nextContainer = replaceContent(currentCompare.container, content);
    setCurrentContainer(nextContainer);
  }, [setCurrentContainer]);

  const handleRetry = useCallback(() => {
    const currentCompare = compareRef.current;
    if (!currentCompare.container) return;
    setCurrentContainer({ ...currentCompare.container });
  }, [setCurrentContainer]);

  const canUpdate = !!sample?.can_update;

  return (
    <Modal
      centered
      size="xxxl"
      show={!!showCompareModal}
      animation
      onHide={close}
    >
      <CompareSpectraHeader
        sample={sample}
        container={compare.container}
        originalAnalyses={compare.originalAnalyses}
        showUndo={compare.showUndo}
        onSelectionChange={handleSelectionChange}
        onUndo={handleUndo}
        onClose={close}
      />
      <Modal.Body className="vh-80">
        <CompareSpectraBody
          status={compare.status === COMPARE_STATUS.IDLE ? COMPARE_STATUS.LOADING : compare.status}
          spectra={compare.spectra}
          multiEntities={compare.multiEntities}
          failures={compare.failures}
          error={compare.error}
          saveError={compare.saveError}
          container={compare.container}
          sample={sample}
          canUpdate={canUpdate}
          onClose={close}
          onRetry={handleRetry}
          onSave={handleSave}
          onSaveClose={handleSaveClose}
          onWritePeak={handleWritePeak}
          onWriteMpy={handleWriteMpy}
          onWriteClosePeak={handleWriteClosePeak}
          onWriteCloseMpy={handleWriteCloseMpy}
          onDescriptionChanged={handleDescriptionChanged}
        />
      </Modal.Body>
    </Modal>
  );
};

CompareSpectraModal.propTypes = {
  sample: PropTypes.object.isRequired,
  onContainerChange: PropTypes.func,
  onSampleChanged: PropTypes.func,
  onSubmit: PropTypes.func,
};

CompareSpectraModal.defaultProps = {
  onContainerChange: () => {},
  onSampleChanged: () => {},
  onSubmit: () => {},
};

export default CompareSpectraModal;
