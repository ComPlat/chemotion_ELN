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
    };

    this.onChange = this.onChange.bind(this);
    this.closeOp = this.closeOp.bind(this);
    this.saveOp = this.saveOp.bind(this);
    this.renderEmpty = this.renderEmpty.bind(this);
    this.renderSpectraEditor = this.renderSpectraEditor.bind(this);
    this.handleChangeSelectAnalyses = this.handleChangeSelectAnalyses.bind(this);
    this.buildOpsByLayout = this.buildOpsByLayout.bind(this);
  }

  componentDidMount() {
    SpectraStore.listen(this.onChange);
  }

  componentWillUnmount() {
    SpectraStore.unlisten(this.onChange);
  }

  onChange(newState) {
    const origState = this.state;
    this.setState({ ...origState, ...newState });
  }

  handleChangeSelectAnalyses(treeData, selectedFiles, info) {
    const { elementData, handleSampleChanged } = this.props;
    const { container } = this.state;
    const selectedData = GetSelectedComparedAnalyses(container, treeData, selectedFiles, info);
    container.extended_metadata.analyses_compared = selectedData;
    handleSampleChanged(elementData);
    const spcCompareInfo = BuildSpectraComparedInfos(elementData, container);
    SpectraActions.LoadSpectraCompare.defer(spcCompareInfo);
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
    SpectraActions.SaveMultiSpectraComparison(selectedFiles, container.id, curveIdx, editedDataSpectra);
    handleSubmit();
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
    const { elementData } = this.props;
    const { menuItems } = BuildSpectraComparedSelection(elementData);
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
          />
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
