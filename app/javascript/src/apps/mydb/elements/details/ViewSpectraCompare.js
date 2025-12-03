import React from 'react';
import { Button, Modal, Card } from 'react-bootstrap';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import SpectraStore from 'src/stores/alt/stores/SpectraStore';
import { SpectraEditor, FN } from '@complat/react-spectra-editor';
import TreeSelect from 'antd/lib/tree-select';

import { BuildSpectraComparedSelection, GetSelectedComparedAnalyses, BuildSpectraComparedInfos, ProcessSampleWithComparisonAnalyses } from 'src/utilities/SpectraHelper';
import PropTypes from 'prop-types';

const rmRefreshed = (analysis) => {
  if (!analysis) return analysis;
  const { refreshed, ...coreAnalysis } = analysis;
  return coreAnalysis;
};

class ViewSpectraCompare extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...SpectraStore.getState(),
      originalAnalyses: null,
      showUndo: false,
    };

    this.onChange = this.onChange.bind(this);
    this.closeOp = this.closeOp.bind(this);
    this.saveOp = this.saveOp.bind(this);
    this.renderEmpty = this.renderEmpty.bind(this);
    this.renderSpectraEditor = this.renderSpectraEditor.bind(this);
    this.handleChangeSelectAnalyses = this.handleChangeSelectAnalyses.bind(this);
    this.buildOpsByLayout = this.buildOpsByLayout.bind(this);
    this.handleUndo = this.handleUndo.bind(this);
  }

  componentDidMount() {
    SpectraStore.listen(this.onChange);
  }

  componentDidUpdate(prevProps) {
    if (this.props.elementData !== prevProps.elementData) {
  
      const updatedContainer = this.props.elementData.container;
      this.setState({ container: updatedContainer });
  
      let { menuItems, selectedFiles } =
        BuildSpectraComparedSelection(this.props.elementData, this.props.elementData.container);
    
  
      menuItems = this.filterMenuItemsBySelectedLayout(updatedContainer, menuItems);
  
      this.setState({
        container: this.props.elementData.container,
        menuItems,
        selectedFilesIds: selectedFiles
      });
    }
  }
  

  componentWillUnmount() {
    SpectraStore.unlisten(this.onChange);
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
    let { menuItems, selectedFiles } = BuildSpectraComparedSelection(this.props.elementData, newState.container || this.props.elementData.container);
    menuItems = this.filterMenuItemsBySelectedLayout(newState.container, menuItems);

    if (!this.state.originalAnalyses && newState?.container?.extended_metadata?.analyses_compared) {
      this.setState({
        originalAnalyses: [...newState.container.extended_metadata.analyses_compared],
      });
    }

    this.setState({
      ...newState,
      menuItems,
      selectedFilesIds: selectedFiles
    });
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
  
    const spcCompareInfo = BuildSpectraComparedInfos(elementData, {
      ...container,
      extended_metadata: {
        ...container.extended_metadata,
        analyses_compared: selectedData
      }
    });
  
    if (spcCompareInfo) {
      SpectraActions.LoadSpectraCompare.defer(spcCompareInfo);
    }
  
    let { menuItems } = BuildSpectraComparedSelection(elementData);
    menuItems = this.filterMenuItemsBySelectedLayout(container, menuItems);
  
    const originalCount = originalAnalyses?.length || 0;
    const currentCount = selectedData?.length || 0;
  
    this.setState({
      menuItems,
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

      let { menuItems } = BuildSpectraComparedSelection(elementData);
      menuItems = this.filterMenuItemsBySelectedLayout(container, menuItems);

      this.setState({
        menuItems,
        showUndo: false
      });
    }
  }


  closeOp() {
    SpectraActions.ToggleCompareModal.defer(null);
  }

  saveOp(params) {
    const { spectraCompare, container } = this.state;
    const {
      peaks, shift, scan, thres, analysis, keepPred,
      integration, multiplicity, waveLength, cyclicvoltaSt, curveSt
    } = params;

    const { curveIdx } = curveSt;
    const { handleSubmit, handleSampleChanged, elementData, handleContainerChanged } = this.props;

    const editedDataSpectra = spectraCompare.map((si, idx) => {
      const selectedShift = shift.shifts[idx];
      const selectedIntegration = integration.integrations[idx];
      const selectedMultiplicity = multiplicity.multiplicities[idx];

      const fPeaks = FN.rmRef(peaks, shift);

      return {
        si,
        peaksStr: FN.toPeakStr(fPeaks),
        selectedShift,
        scan,
        thres,
        integration: JSON.stringify(selectedIntegration),
        multiplicity: JSON.stringify(selectedMultiplicity),
        predict: JSON.stringify(rmRefreshed(analysis)),
        keepPred,
        waveLengthStr: JSON.stringify(waveLength),
        cyclicvolta: JSON.stringify(cyclicvoltaSt),
        curveIdx
      };
    });

    SpectraActions.ToggleCompareModal.defer(null);

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
    

    let targetContainerId = container.id;
    if (
      container?.extended_metadata?.analyses_compared?.length > 0 &&
      container.extended_metadata.analyses_compared[0].dataset?.id
    ) {
      targetContainerId = container.extended_metadata.analyses_compared[0].dataset.id;
    }

    SpectraActions.SaveMultiSpectraComparison(
      selectedFiles,
      targetContainerId,
      curveIdx,
      editedDataSpectra,
      cb
    );
  }

  

  buildOpsByLayout(et) {
    return [
      { name: 'save', value: this.saveOp },
      { name: 'close', value: this.closeOp },
    ];
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
            treeData={menuItems}
            value={selectedFiles}
            onChange={(value, label, extra) => this.handleChangeSelectAnalyses(menuItems, value, extra)}
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
