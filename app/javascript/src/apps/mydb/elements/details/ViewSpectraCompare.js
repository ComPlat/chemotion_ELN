import React from 'react';
import { Button, Modal, Card } from 'react-bootstrap';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import SpectraStore from 'src/stores/alt/stores/SpectraStore';
import { SpectraEditor, FN } from '@complat/react-spectra-editor';
import { TreeSelect } from 'antd';
import { SpectraOps } from 'src/utilities/quillToolbarSymbol';

import { BuildSpectraComparedSelection, GetSelectedComparedAnalyses, BuildSpectraComparedInfos, ProcessSampleWithComparisonAnalyses } from 'src/utilities/SpectraHelper';
import PropTypes from 'prop-types';

const rmRefreshed = (analysis) => {
  if (!analysis) return analysis;
  const { refreshed, ...coreAnalysis } = analysis;
  return coreAnalysis;
};

const layoutsWillShowMulti = [
  FN.LIST_LAYOUT.CYCLIC_VOLTAMMETRY,
  FN.LIST_LAYOUT.SEC,
  FN.LIST_LAYOUT.AIF,
  FN.LIST_LAYOUT.H1,
  FN.LIST_LAYOUT.C13,
  FN.LIST_LAYOUT.UVVIS,
  FN.LIST_LAYOUT.HPLC_UVVIS,
];

class ViewSpectraCompare extends React.Component {
  constructor(props) {
    super(props);

    const initialState = SpectraStore.getState();
    const container = initialState.container || props.elementData.container;
    const { menuItems, selectedFiles } = BuildSpectraComparedSelection(props.elementData, container);

    this.state = {
      ...initialState,
      container,
      menuItems,
      selectedFilesIds: selectedFiles,
      originalAnalyses: container?.extended_metadata?.analyses_compared ? [...container.extended_metadata.analyses_compared] : null,
      showUndo: false,
    };

    this.state.menuItems = this.filterMenuItemsBySelectedLayout(container, menuItems);

    this.onChange = this.onChange.bind(this);
    this.closeOp = this.closeOp.bind(this);
    this.saveOp = this.saveOp.bind(this);
    this.saveCloseOp = this.saveCloseOp.bind(this);
    this.writeCommon = this.writeCommon.bind(this);
    this.writePeakOp = this.writePeakOp.bind(this);
    this.writeMpyOp = this.writeMpyOp.bind(this);
    this.writeCloseCommon = this.writeCloseCommon.bind(this);
    this.writeClosePeakOp = this.writeClosePeakOp.bind(this);
    this.writeCloseMpyOp = this.writeCloseMpyOp.bind(this);
    this.renderEmpty = this.renderEmpty.bind(this);
    this.renderSpectraEditor = this.renderSpectraEditor.bind(this);
    this.handleChangeSelectAnalyses = this.handleChangeSelectAnalyses.bind(this);
    this.buildOpsByLayout = this.buildOpsByLayout.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
    this.limitMenuItemsToSelection = this.limitMenuItemsToSelection.bind(this);
  }

  componentDidMount() {
    SpectraStore.listen(this.onChange);
  }

  componentDidUpdate(prevProps) {
    if (this.props.elementData !== prevProps.elementData) {
      const updatedContainer = this.resolveActiveContainer(this.props.elementData, this.state.container);
      let { menuItems, selectedFiles } =
        BuildSpectraComparedSelection(this.props.elementData, updatedContainer);

      menuItems = this.filterMenuItemsBySelectedLayout(updatedContainer, menuItems);
  
      this.setState({
        container: updatedContainer,
        menuItems,
        selectedFilesIds: selectedFiles
      });
    }
  }
  

  componentWillUnmount() {
    SpectraStore.unlisten(this.onChange);
  }

  limitMenuItemsToSelection(menuItems, allowedIds) {
    if (!menuItems) return [];
    
    return menuItems.reduce((acc, item) => {
      if (!item.children) {
        if (allowedIds.includes(item.value)) {
          acc.push(item);
        }
      } else {
        const filteredChildren = this.limitMenuItemsToSelection(item.children, allowedIds);
        if (filteredChildren.length > 0) {
          acc.push({ ...item, children: filteredChildren });
        }
      }
      return acc;
    }, []);
  }

  filterMenuItemsBySelectedLayout(container, menuItems) {
    if (
      container &&
      container.extended_metadata &&
      container.extended_metadata.analyses_compared &&
      container.extended_metadata.analyses_compared.length > 0
    ) {
      const selectedLayout = container.extended_metadata.analyses_compared[0]?.layout ?? null;
      if (selectedLayout) {
        return menuItems.map((item) => {
          if (item.title !== selectedLayout) {
            return { ...item, disabled: true };
          }
          return item;
        });
      }
    }
    return menuItems;
  }

  onChange(newState) {
    const storeContainer = newState.container;
    const localContainer = this.state.container;
    const isOpening = newState.showCompareModal && !this.state.showCompareModal;
    const isDifferent = storeContainer && localContainer && storeContainer.id !== localContainer.id;

    let containerToUse;

    if (isOpening || isDifferent) {
      containerToUse = this.resolveActiveContainer(
        this.props.elementData,
        storeContainer || localContainer
      );
      if (containerToUse?.extended_metadata?.analyses_compared) {
        this.setState({
          originalAnalyses: [...containerToUse.extended_metadata.analyses_compared],
        });
      } else {
        this.setState({ originalAnalyses: null });
      }
    } else {
      containerToUse = this.resolveActiveContainer(
        this.props.elementData,
        localContainer || storeContainer
      );

      if (!this.state.originalAnalyses && newState?.container?.extended_metadata?.analyses_compared) {
        this.setState({
          originalAnalyses: [...newState.container.extended_metadata.analyses_compared],
        });
      }
    }

    let { menuItems, selectedFiles } = BuildSpectraComparedSelection(this.props.elementData, containerToUse);
    menuItems = this.filterMenuItemsBySelectedLayout(containerToUse, menuItems);

    this.setState({
      ...newState,
      container: containerToUse,
      menuItems,
      selectedFilesIds: selectedFiles
    });
  }

  resolveActiveContainer(elementData, preferredContainer) {
    const preferredId = preferredContainer?.id;
    const list = typeof elementData?.analysisContainers === 'function'
      ? elementData.analysisContainers()
      : [];
    if (preferredId && Array.isArray(list) && list.length > 0) {
      const found = list.find((container) => container.id === preferredId);
      if (found) return found;
    }
    return preferredContainer || elementData?.container;
  }

  handleChangeSelectAnalyses(treeData, selectedFiles, info) {
    const { elementData } = this.props;
    const { container, originalAnalyses } = this.state;
  
    const selectedData = GetSelectedComparedAnalyses(
      container,
      treeData,
      selectedFiles,
      info
    );

    const updatedContainer = {
      ...container,
      extended_metadata: {
        ...container.extended_metadata,
        analyses_compared: selectedData
      }
    };
  
    const spcCompareInfo = BuildSpectraComparedInfos(elementData, updatedContainer);
  
    if (spcCompareInfo) {
      SpectraActions.LoadSpectraCompare.defer(spcCompareInfo);
    }
  
    let { menuItems: updatedMenuItems, selectedFiles: updatedSelectedFiles } = BuildSpectraComparedSelection(elementData, updatedContainer);
    updatedMenuItems = this.filterMenuItemsBySelectedLayout(updatedContainer, updatedMenuItems);
  
    const originalCount = originalAnalyses?.length || 0;
    const currentCount = selectedData?.length || 0;
  
    this.setState({
      container: updatedContainer,
      menuItems: updatedMenuItems,
      selectedFilesIds: updatedSelectedFiles,
      showUndo: currentCount < originalCount
    });
  }
  

  handleUndo() {
    const { elementData, handleSampleChanged } = this.props;
    const { container, originalAnalyses } = this.state;

    if (container && originalAnalyses) {
      container.extended_metadata.analyses_compared = [...originalAnalyses];

      handleSampleChanged(elementData);

      const spcCompareInfo = BuildSpectraComparedInfos(elementData, container);
      if (spcCompareInfo) {
        SpectraActions.LoadSpectraCompare.defer(spcCompareInfo);
      }

      let { menuItems, selectedFiles } = BuildSpectraComparedSelection(elementData, container);
      menuItems = this.filterMenuItemsBySelectedLayout(container, menuItems);

      this.setState({
        menuItems,
        selectedFilesIds: selectedFiles,
        showUndo: false
      });
    }
  }


  closeOp() {
    SpectraActions.ToggleCompareModal.defer(null);
  }

  resolveWriteParams(params) {
    const payloads = this.getSavePayloads(params);
    const fallbackCurveIdx = params?.curveSt?.curveIdx ?? 0;
    const payload = payloads[fallbackCurveIdx] || payloads[0] || {};
    const curveIdx = payload?.curveSt?.curveIdx ?? payload?.curveIdx ?? fallbackCurveIdx;

    const shift = payload?.shift?.shifts ? payload.shift : { shifts: [payload?.shift] };
    const integration = payload?.integration?.integrations
      ? payload.integration
      : { integrations: [payload?.integration] };
    const multiplicity = payload?.multiplicity?.multiplicities
      ? payload.multiplicity
      : { multiplicities: [payload?.multiplicity] };

    return {
      peaks: payload?.peaks,
      shift,
      layout: payload?.layout,
      isAscend: payload?.isAscend,
      decimal: payload?.decimal ?? 2,
      body: payload?.body,
      isIntensity: payload?.isIntensity,
      integration,
      multiplicity,
      waveLength: payload?.waveLength,
      curveSt: { curveIdx },
    };
  }

  getContent(curveIdx = 0) {
    const { spectraCompare } = this.state;
    if (!Array.isArray(spectraCompare) || spectraCompare.length === 0) return null;
    return spectraCompare[curveIdx] || spectraCompare[0] || null;
  }

  formatPks({
    peaks, shift, layout, isAscend, decimal, body, isIntensity, integration, curveSt, waveLength,
  }) {
    const layoutOpsObj = SpectraOps[layout];
    if (!layoutOpsObj) return [];

    const { curveIdx } = curveSt;
    const selectedShift = shift?.shifts?.[curveIdx];
    const selectedIntegration = integration?.integrations?.[curveIdx];
    if (!selectedShift || !selectedIntegration) return [];

    const content = this.getContent(curveIdx);
    const entity = content?.jcamp ? FN.buildData(content.jcamp)?.entity : null;
    if (!entity) return [];

    const features = entity?.features;
    const f0 = Array.isArray(features)
      ? features[0]
      : (features?.editPeak || features?.autoPeak || features) || {};
    const temperature = entity?.temperature;

    let observeFrequency = Array.isArray(f0?.observeFrequency)
      ? f0.observeFrequency[0]
      : f0?.observeFrequency;
    const freq = Array.isArray(observeFrequency) ? observeFrequency[0] : observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';

    const boundary = (f0 && (typeof f0.maxY !== 'undefined') && (typeof f0.minY !== 'undefined'))
      ? { maxY: f0.maxY, minY: f0.minY }
      : undefined;

    const mBody = body || FN.peaksBody({
      peaks,
      layout,
      decimal,
      shift,
      isAscend,
      isIntensity,
      boundary,
      integration: selectedIntegration,
      waveLength,
      temperature,
    });

    const { label, value, name } = selectedShift.ref || {};
    const solvent = label ? `${name.split('(')[0].trim()} [${value.toFixed(decimal)} ppm], ` : '';
    return [
      ...layoutOpsObj.head(freqStr, solvent),
      { insert: mBody },
      ...layoutOpsObj.tail(),
    ];
  }

  formatMpy({
    shift, isAscend, decimal, integration, multiplicity, layout, curveSt,
  }) {
    const { curveIdx } = curveSt;
    const selectedShift = shift?.shifts?.[curveIdx];
    const selectedIntegration = integration?.integrations?.[curveIdx];
    const selectedMultiplicity = multiplicity?.multiplicities?.[curveIdx];
    if (!selectedShift || !selectedIntegration || !selectedMultiplicity) return [];

    const content = this.getContent(curveIdx);
    const entity = content?.jcamp ? FN.buildData(content.jcamp)?.entity : null;
    if (!entity) return [];

    const features = entity?.features;
    const f0 = Array.isArray(features)
      ? features[0]
      : (features?.editPeak || features?.autoPeak || features) || {};

    let observeFrequency = Array.isArray(f0?.observeFrequency)
      ? f0.observeFrequency[0]
      : f0?.observeFrequency;
    const freq = Array.isArray(observeFrequency) ? observeFrequency[0] : observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';

    const { refArea, refFactor, stack: isStack } = selectedIntegration;
    const shiftVal = selectedMultiplicity.shift;
    const ms = selectedMultiplicity.stack || [];
    const is = isStack || [];

    const macs = ms.map((m) => {
      const { peaks: mPeaks, mpyType, xExtent } = m;
      const { xL, xU } = xExtent || {};
      const it = is.find((i) => i.xL === xL && i.xU === xU) || { area: 0 };
      const area = refArea ? (it.area * refFactor) / refArea : 0;
      const center = FN.calcMpyCenter(mPeaks, shiftVal, mpyType);
      const xs = (m.mPeaks || mPeaks || []).map((p) => p.x).sort((a, b) => a - b);
      const [aIdx, bIdx] = isAscend ? [0, xs.length - 1] : [xs.length - 1, 0];
      const mxA = mpyType === 'm' && xs.length ? (xs[aIdx] - shiftVal).toFixed(decimal) : 0;
      const mxB = mpyType === 'm' && xs.length ? (xs[bIdx] - shiftVal).toFixed(decimal) : 0;
      return {
        ...m, area, center, mxA, mxB,
      };
    }).sort((a, b) => (isAscend ? a.center - b.center : b.center - a.center));

    let couplings = [].concat(...macs.map((m) => {
      const jsSorted = (m.js || []).slice().sort((a, b) => (isAscend ? a - b : b - a));
      const c = m.center;
      const type = m.mpyType || 'm';
      const it = Math.round(m.area || 0);
      const js = [].concat(...jsSorted.map((j) => ([
        { insert: 'J', attributes: { italic: true } },
        { insert: ` = ${j.toFixed(1)} Hz` },
        { insert: ', ' },
      ])));
      const atomCount = layout === '1H' ? `, ${it}H` : '';
      const location = type === 'm'
        ? `${m.mxA}–${m.mxB}`
        : `${(c ?? 0).toFixed(decimal)}`;

      return jsSorted.length === 0
        ? [{ insert: `${location} (${type}${atomCount})` }, { insert: ', ' }]
        : [
            { insert: `${location} (${type}, ` },
            ...js.slice(0, js.length - 1),
            { insert: `${atomCount})` },
            { insert: ', ' },
          ];
    }));
    couplings = couplings.slice(0, couplings.length - 1);

    const { label, value, name } = selectedShift.ref || {};
    const solvent = label ? `${name.split('(')[0].trim()} [${value.toFixed(decimal)} ppm], ` : '';
    return [
      { attributes: { script: 'super' }, insert: layout.slice(0, -1) },
      { insert: `${layout.slice(-1)} NMR (${freqStr}${solvent}ppm) δ = ` },
      ...couplings,
      { insert: '.' },
    ];
  }

  writeCommon(params, isMpy = false) {
    const { container } = this.state;
    const { elementData, handleSampleChanged, handleContainerChanged } = this.props;
    const resolved = this.resolveWriteParams(params);
    if (!resolved?.layout) {
      this.saveOp(params);
      return;
    }

    const ops = isMpy ? this.formatMpy(resolved) : this.formatPks(resolved);
    if (!ops.length) {
      this.saveOp(params);
      return;
    }

    const existingContent = container?.extended_metadata?.content;
    const currentOps = Array.isArray(existingContent?.ops) ? [...existingContent.ops] : [{ insert: '\n' }];
    let nextOps = [...currentOps, ...ops];
    if (nextOps[0]?.insert === '\n' && nextOps.length > 1) {
      nextOps = nextOps.slice(1);
    }

    const updatedContainer = {
      ...container,
      extended_metadata: {
        ...(container.extended_metadata || {}),
        content: { ops: nextOps },
      },
    };

    this.setState({ container: updatedContainer });
    handleContainerChanged(updatedContainer);

    const updatedSample = ProcessSampleWithComparisonAnalyses(
      elementData,
      { container: updatedContainer },
    );

    handleSampleChanged(updatedSample, () => this.saveOp(params, updatedContainer));
  }

  writePeakOp(params) {
    this.writeCommon(params, false);
  }

  writeMpyOp(params) {
    this.writeCommon(params, true);
  }

  writeCloseCommon(params, isMpy = false) {
    this.writeCommon(params, isMpy);
    this.closeOp();
  }

  writeClosePeakOp(params) {
    this.writeCloseCommon(params, false);
  }

  writeCloseMpyOp(params) {
    this.writeCloseCommon(params, true);
  }

  saveCloseOp(params) {
    this.saveOp(params);
    this.closeOp();
  }

  getSavePayloads(params) {
    const spectraList = Array.isArray(params?.spectra_list) ? params.spectra_list : [];
    if (spectraList.length > 0) return spectraList;
    return [params];
  }

  resolveSpcInfo(spectraCompare, curveIdx, fallbackIdx) {
    if (!Array.isArray(spectraCompare) || spectraCompare.length === 0) return null;
    return spectraCompare[curveIdx] || spectraCompare[fallbackIdx] || spectraCompare[0] || null;
  }

  buildEditedDataSpectra(payload, curveIdx, si) {
    const hasShiftArray = Array.isArray(payload?.shift?.shifts);
    const fPeaks = payload?.peaks && hasShiftArray ? FN.rmRef(payload.peaks, payload.shift, curveIdx) : payload?.peaks;
    const selectedShift = payload?.shift?.shifts ? payload.shift.shifts[curveIdx] : payload?.shift;
    const selectedIntegration = payload?.integration?.integrations
      ? payload.integration.integrations[curveIdx]
      : payload?.integration;
    const selectedMultiplicity = payload?.multiplicity?.multiplicities
      ? payload.multiplicity.multiplicities[curveIdx]
      : payload?.multiplicity;

    return {
      si,
      peaksStr: FN.toPeakStr(fPeaks),
      selectedShift,
      scan: payload?.scan,
      thres: payload?.thres,
      integration: JSON.stringify(selectedIntegration),
      multiplicity: JSON.stringify(selectedMultiplicity),
      predict: JSON.stringify(rmRefreshed(payload?.analysis)),
      keepPred: payload?.keepPred,
      waveLengthStr: JSON.stringify(payload?.waveLength),
      cyclicvolta: JSON.stringify(payload?.cyclicvoltaSt),
      curveIdx,
      simulatenmr: payload?.simulatenmr ?? false,
      axesUnits: JSON.stringify(payload?.axesUnitsSt),
      detector: JSON.stringify(payload?.detectorSt),
      dscMetaData: JSON.stringify(payload?.dscMetaData),
    };
  }

  saveOp(params, forcedContainer = null) {
    const { spectraCompare } = this.state;
    const container = forcedContainer || this.state.container;
    const { handleSubmit, handleSampleChanged, elementData, handleContainerChanged } = this.props;

    const payloads = this.getSavePayloads(params);
    if (!payloads.length) return;

    const targets = payloads.map((payload, idx) => {
      const curveIdx = payload?.curveSt?.curveIdx ?? payload?.curveIdx ?? idx;
      const si = this.resolveSpcInfo(spectraCompare, curveIdx, idx);
      if (!si) return null;
      return { payload, curveIdx, si };
    }).filter(Boolean);

    if (!targets.length) return;

    const editedDataSpectra = targets.map((target) => (
      this.buildEditedDataSpectra(target.payload, target.curveIdx, target.si)
    ));

    const frontCurveIdx = params?.curveSt?.curveIdx ?? targets[0].curveIdx;

    let selectedFiles = [];
    if (container?.extended_metadata?.analyses_compared) {
      selectedFiles = container.extended_metadata.analyses_compared.map(a => a.file.id);
    }

    const cb = (response) => {

      if (!response) {
        handleSubmit();
        return;
      }

      const { dataset, analyses_compared } = response;
      const updatedContainer = { ...container };

      updatedContainer.extended_metadata = {
        ...(updatedContainer.extended_metadata || {}),
        analyses_compared: analyses_compared || [],
        is_comparison: true,
        kind: updatedContainer.extended_metadata?.kind || null,
    };
    

      const currentChildren = updatedContainer.children ? [...updatedContainer.children] : [];
      const existingIndex = currentChildren.findIndex((c) => c.id === dataset.id);

      if (existingIndex > -1) {
        currentChildren[existingIndex] = dataset;
      } else {
        currentChildren.push(dataset);
      }
      updatedContainer.children = currentChildren;

      updatedContainer.comparable_info = {
        ...(updatedContainer.comparable_info || {}),
        list_attachments: dataset.attachments || [],
        list_dataset: updatedContainer.comparable_info?.list_dataset || [],
        list_analyses: updatedContainer.comparable_info?.list_analyses || [],
        layout: updatedContainer.comparable_info?.layout || null,
        is_comparison: true
      };

      if (!updatedContainer.extended_metadata.kind) {
        updatedContainer.extended_metadata.kind =
          updatedContainer.comparable_info?.layout
            ?.replace(/^Type:\s*/i, '')
            ?.trim()
            || null;
      }
      
      let { menuItems, selectedFiles } = BuildSpectraComparedSelection(elementData, updatedContainer);
      menuItems = this.filterMenuItemsBySelectedLayout(updatedContainer, menuItems);

      this.setState({
        container: updatedContainer,
        menuItems,
        selectedFilesIds: selectedFiles,
      });

      // Reload spectra blobs from updated attachment ids so editor reflects saved changes immediately.
      const spcCompareInfo = BuildSpectraComparedInfos(elementData, updatedContainer);
      if (Array.isArray(spcCompareInfo) && spcCompareInfo.length > 0) {
        SpectraActions.LoadSpectraCompare.defer(spcCompareInfo);
      }

      handleContainerChanged(updatedContainer);
      const updatedSample = ProcessSampleWithComparisonAnalyses(
        elementData,
        { container: updatedContainer }
      );
      handleSampleChanged(updatedSample);
      updatedSample
      .analysisContainers()
      .filter(c => c.id === updatedContainer.id)
      .forEach(c => {
          c.comparable_info = {
            ...c.comparable_info,
            layout: updatedContainer.comparable_info?.layout
          };
      });

      handleSubmit();
    };
    

    let targetContainerId;

    const datasetChild = container.children?.find(
      c => c.container_type === 'dataset'
    );
    
    if (datasetChild) {
      targetContainerId = datasetChild.id;
    } else {
      targetContainerId = container.id;
    }

    SpectraActions.SaveMultiSpectraComparison(
      selectedFiles,
      targetContainerId,
      frontCurveIdx,
      editedDataSpectra,
      cb
    );
  }

  

  buildOpsByLayout(et) {
    const { elementData } = this.props;
    const updatable = elementData && elementData.can_update;

    let baseOps = updatable ? [
      { name: 'write peak & save', value: this.writePeakOp },
      { name: 'write peak, save & close', value: this.writeClosePeakOp },
    ] : [];

    const isNmr = updatable && ['1H', '13C', '15N', '19F', '29Si', '31P'].includes(et.layout);
    if (isNmr) {
      baseOps = [
        ...baseOps,
        { name: 'write multiplicity & save', value: this.writeMpyOp },
        { name: 'write multiplicity, save & close', value: this.writeCloseMpyOp },
      ];
    }

    if (layoutsWillShowMulti.includes(et.layout)) {
      baseOps = [
        ...baseOps,
        { name: 'save', value: this.saveOp },
        { name: 'save & close', value: this.saveCloseOp },
      ];
    } else if (updatable) {
      baseOps = [
        ...baseOps,
        { name: 'save', value: this.saveOp },
        { name: 'save & close', value: this.saveCloseOp },
      ];
    }

    baseOps = baseOps.filter((op, i, arr) => i === arr.findIndex((o) => o.name === op.name));
    return baseOps;
  }

  renderEmpty() {
    return (
      <div className="d-flex h-100 justify-content-center align-items-center">
        <Card className="text-center p-4 border-warning bg-light" onClick={this.closeOp}>
          <Card.Body>
            <i className="fa fa-exclamation-triangle fa-3x text-warning" />
            <h3 className="mt-3">No Spectra Found!</h3>
            <h3>Please refresh the page!</h3>
            <br />
            <h5>Click here to close the window...</h5>
          </Card.Body>
        </Card>
      </div>
    );
  }

  renderTitle() {
    const { menuItems, container, selectedFilesIds } = this.state;
    let modalTitle = '';
    let selectedFiles = selectedFilesIds;
    const isComparison = container?.extended_metadata?.is_comparison;

    if (container) {
      modalTitle = container.name;
      
      if (selectedFiles === undefined) {
        const { analyses_compared } = container.extended_metadata;
        if (analyses_compared) {
          selectedFiles = analyses_compared.map((analysis) => (
            analysis.file.id
          ));
        }
      }
    }
    
    
    let filteredMenuItems = menuItems;
    const refAnalyses = this.state.originalAnalyses || container?.extended_metadata?.analyses_compared;

    if (refAnalyses) {
        const allowedIds = refAnalyses.map(a => a.file.id);
        filteredMenuItems = this.limitMenuItemsToSelection(menuItems, allowedIds);
    }

    return (
      <Modal.Header className="justify-content-between align-items-baseline">
        <span className="fs-3">
          {modalTitle}
        </span>
        <div className="d-flex gap-1 align-items-center">
          <TreeSelect
            style={{ width: 800 }}
            placeholder="Please select"
            treeCheckable={true}
            treeData={filteredMenuItems}
            value={selectedFiles}
            onChange={(value, label, extra) => this.handleChangeSelectAnalyses(filteredMenuItems, value, extra)}
            maxTagCount={2}
            getPopupContainer={(triggerNode) => triggerNode.parentNode}
          />
          <Button
            className="ms-auto"
            size="sm"
            variant="danger"
            onClick={this.handleUndo}
            style={{ display: this.state.showUndo ? 'inline-block' : 'none' }}
          >
            <i className="fa fa-undo" />
          </Button>

        </div>
        <Button
          variant="danger"
          size="sm"
          onClick={this.closeOp}
        >
          <i className="fa fa-times me-1" />
          Close without Save
        </Button>
      </Modal.Header>
    );
  }

  renderSpectraEditor(spectraCompare) {
    let currEntity = null;

    const multiEntities = spectraCompare.map((spc) => {
      const {
        entity
      } = FN.buildData(spc.jcamp);
      currEntity = entity;
      return entity;
    });

    const { container } = this.state;
    let entityFileNames = null;
    if (container) {
      const { comparable_info } = container;
      if (comparable_info) {
        const { list_attachments } = comparable_info;
        if (list_attachments) {
          entityFileNames = list_attachments.map((att) => {
            return att.filename;
          });
        }
      }
    }

    const operations = this.buildOpsByLayout(currEntity);

    return (
      !multiEntities && multiEntities.length === 0 ? this.renderEmpty()
        : (
          <SpectraEditor
            entity={currEntity}
            multiEntities={multiEntities}
            entityFileNames={entityFileNames}
            operations={operations}
          />
        )
    );
  }

  render() {
    const { showCompareModal, spectraCompare } = this.state;

    return (
      <Modal
        centered
        size="xxxl"
        show={showCompareModal}
        animation
        onHide={this.closeOp}
      >
        {this.renderTitle()}
        <Modal.Body className="vh-80">
          {
            (spectraCompare && spectraCompare.length > 0) ? this.renderSpectraEditor(spectraCompare)
              : this.renderEmpty()
          }
        </Modal.Body>
      </Modal>
    );
  }
}

ViewSpectraCompare.propTypes = {
  elementData: PropTypes.object.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleContainerChanged: PropTypes.func.isRequired,
};

export default ViewSpectraCompare;
