import React from 'react';
import { Button, Modal, Card } from 'react-bootstrap';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import SpectraStore from 'src/stores/alt/stores/SpectraStore';
import { SpectraEditor, FN } from '@complat/react-spectra-editor';
import TreeSelect from 'antd/lib/tree-select';

import { BuildSpectraComparedSelection, GetSelectedComparedAnalyses, BuildSpectraComparedInfos } from 'src/utilities/SpectraHelper';
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
      const { container } = this.state;
      const { handleSampleChanged, elementData } = this.props;
      const activeContainer = container || this.props.elementData.container;

      let { menuItems, selectedFiles } = BuildSpectraComparedSelection(this.props.elementData, activeContainer);
      menuItems = this.filterMenuItemsBySelectedLayout(activeContainer, menuItems);

      if (activeContainer && activeContainer.extended_metadata && selectedFiles.length > 0) {
        const currentAnalysesCompared = activeContainer.extended_metadata.analyses_compared || [];

        const currentFileIds = currentAnalysesCompared.map(a => a.file.id);
        const filesChanged = selectedFiles.some(id => !currentFileIds.includes(id));

        if (filesChanged && currentAnalysesCompared.length === selectedFiles.length) {
          const updatedAnalysesCompared = currentAnalysesCompared.map((analysis, idx) => {
            if (idx < selectedFiles.length) {
              return {
                ...analysis,
                file: {
                  ...analysis.file,
                  id: selectedFiles[idx]
                }
              };
            }
            return analysis;
          });

          activeContainer.extended_metadata.analyses_compared = updatedAnalysesCompared;
          handleSampleChanged(elementData);
        }
      }

      this.setState({ menuItems });
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
        return menuItems.filter(item => item.title === selectedLayout);
      }
    }
    return menuItems;
  }

  onChange(newState) {
    let { menuItems } = BuildSpectraComparedSelection(this.props.elementData, newState.container || this.props.elementData.container);
    menuItems = this.filterMenuItemsBySelectedLayout(newState.container, menuItems);

    if (!this.state.originalAnalyses && newState?.container?.extended_metadata?.analyses_compared) {
      this.setState({
        originalAnalyses: [...newState.container.extended_metadata.analyses_compared],
      });
    }

    this.setState({
      ...newState,
      menuItems
    });
  }

  handleChangeSelectAnalyses(treeData, selectedFiles, info) {
    const { elementData, handleSampleChanged } = this.props;
    const { container, originalAnalyses } = this.state;
    const selectedData = GetSelectedComparedAnalyses(container, treeData, selectedFiles, info);
    container.extended_metadata.analyses_compared = selectedData;
    handleSampleChanged(elementData);
    const spcCompareInfo = BuildSpectraComparedInfos(elementData, container);
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
    const { spectraCompare } = this.state;
    const {
      peaks, shift, scan, thres, analysis, keepPred,
      integration, multiplicity, waveLength, cyclicvoltaSt, curveSt
    } = params;

    const { curveIdx } = curveSt;
    const { handleSubmit } = this.props;

    const editedDataSpectra = [];

    spectraCompare.forEach((si, idx) => {
      const selectedShift = shift.shifts[idx];
      const selectedIntegration = integration.integrations[idx];
      const selectedMultiplicity = multiplicity.multiplicities[idx];

      const fPeaks = FN.rmRef(peaks, shift);
      const peaksStr = FN.toPeakStr(fPeaks);
      const predict = JSON.stringify(rmRefreshed(analysis));
      const waveLengthStr = JSON.stringify(waveLength);
      const cyclicvolta = JSON.stringify(cyclicvoltaSt);
      const editedIntegration = JSON.stringify(selectedIntegration);
      const editedMultiplicity = JSON.stringify(selectedMultiplicity);

      const editedData = {
        si,
        peaksStr,
        selectedShift,
        scan,
        thres,
        integration: editedIntegration,
        multiplicity: editedMultiplicity,
        predict,
        handleSubmit,
        keepPred,
        waveLengthStr,
        cyclicvolta,
        curveIdx
      };

      editedDataSpectra.push(editedData);
    });

    SpectraActions.ToggleCompareModal.defer(null);
    const { container } = this.state;
    let selectedFiles = [];
    if (container) {
      const { analyses_compared } = container.extended_metadata;
      if (analyses_compared) {
        selectedFiles = analyses_compared.map(analysis => (
          analysis.file.id
        ));
      }
    }
    const cb = (response) => {
      const { dataset } = response;
      if (dataset) {
        const { elementData, handleSampleChanged } = this.props;

        const findAndAdd = (container) => {
          if (container.id === dataset.parent_id) {
            const idx = container.children.findIndex((c) => c.id === dataset.id);
            if (idx > -1) {
              container.children[idx] = dataset;
            } else {
              container.children.push(dataset);
            }
            return true;
          }
          if (container.children) {
            for (let i = 0; i < container.children.length; i += 1) {
              if (findAndAdd(container.children[i])) return true;
            }
          }
          return false;
        };

        if (elementData.container) {
          findAndAdd(elementData.container);
        }

        handleSampleChanged(elementData);
      }
      handleSubmit();
    };
    SpectraActions.SaveMultiSpectraComparison(selectedFiles, container.id, curveIdx, editedDataSpectra, cb);
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
    const { menuItems } = this.state;
    const { container } = this.state;
    let modalTitle = '';
    let selectedFiles = [];
    if (container) {
      modalTitle = container.name;
      const { analyses_compared } = container.extended_metadata;
      if (analyses_compared) {
        selectedFiles = analyses_compared.map((analysis) => (
          analysis.file.id
        ));
      }
    }

    return (
      <Modal.Header className="justify-content-between align-items-baseline">
        <span className="fs-3">
          {modalTitle}
        </span>
        <div className="d-flex gap-1 align-items-center">
          <TreeSelect
            style={{ width: 300 }}
            placeholder="Please select"
            treeCheckable={true}
            treeData={menuItems}
            value={selectedFiles}
            onChange={(value, label, extra) => this.handleChangeSelectAnalyses(menuItems, value, extra)}
            maxTagCount={1}
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
};

export default ViewSpectraCompare;
