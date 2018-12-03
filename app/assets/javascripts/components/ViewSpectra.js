import React from 'react';
import Select from 'react-select';
import { SpectraViewer, ToXY, LIST_LAYOUT } from 'react-spectra-viewer';
import { Modal, Well } from 'react-bootstrap';
import PropTypes from 'prop-types';

import SpectraActions from './actions/SpectraActions';
import SpectraStore from './stores/SpectraStore';
import { SpectraOps } from './utils/quillToolbarSymbol';

class ViewSpectra extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...SpectraStore.getState(),
    };

    this.onChange = this.onChange.bind(this);
    this.onOpenModal = this.onOpenModal.bind(this);
    this.onCloseModal = this.onCloseModal.bind(this);
    this.writePeaks = this.writePeaks.bind(this);
    this.savePeaks = this.savePeaks.bind(this);
    this.renderSpectraViewer = this.renderSpectraViewer.bind(this);
    this.renderEmpty = this.renderEmpty.bind(this);
  }

  componentDidMount() {
    const { sample } = this.props;
    SpectraActions.InitOpts.defer(sample);

    SpectraStore.listen(this.onChange);
  }

  componentDidUpdate(prevProps) {
    const oldCheckSum = prevProps.sample.checksum();
    const { sample } = this.props;
    const newCheckSum = sample.checksum();
    if (oldCheckSum !== newCheckSum) {
      SpectraActions.InitOpts.defer(sample);
    }
  }

  componentWillUnmount() {
    SpectraStore.unlisten(this.onChange);
  }

  onChange(newState) {
    const origState = this.state;
    this.setState({ ...origState, ...newState });
  }

  onChangeSelect(opt) {
    SpectraActions.Select(opt);
  }

  onOpenModal() {
    const { sample } = this.props;
    SpectraActions.ToggleModal();
    SpectraActions.LoadSpectra.defer(sample);
  }

  onCloseModal() {
    SpectraActions.ToggleModal();
  }

  buildData(selectedOpt, allSpectra) {
    let target = null;
    allSpectra.forEach((spc) => {
      if (selectedOpt && spc.id === selectedOpt.idx) {
        target = spc;
      }
    });
    const sp = target && target.file.spectrum;
    const input = sp ? sp.data[0] : {};
    const xLabel = sp ? `X (${sp.xUnit})` : '';
    const yLabel = sp ? `Y (${sp.yUnit})` : '';
    const peakObjs = target && target.file.peakObjs;
    return {
      input, xLabel, yLabel, peakObjs,
    };
  }

  spectraDigit(layout) {
    switch (layout) {
      case LIST_LAYOUT.C13:
        return 10;
      case LIST_LAYOUT.IR:
        return 1;
      case LIST_LAYOUT.H1:
      case LIST_LAYOUT.PLAIN:
      default:
        return 100;
    }
  }

  convertPeaksToStr(peaks, layout) {
    const peaksXY = ToXY(peaks);
    const digit = this.spectraDigit(layout);

    const result = peaksXY.map((p) => {
      const valX = Math.round(parseFloat(p[0]) * digit) / digit;
      return valX;
    });
    const ordered = result.sort((a, b) => a - b).join(', ');
    return ordered;
  }

  spectraOps(layout) {
    const layoutOps = SpectraOps[layout];
    const isArr = Array.isArray(layoutOps);
    if (isArr) {
      return { head: layoutOps, tail: [{ insert: '; ' }] };
    }
    return layoutOps;
  }

  writePeaks(peaks, layout) {
    const { sample, handleSampleChanged } = this.props;
    const { selectedOpt } = this.state;
    const result = this.convertPeaksToStr(peaks, layout);
    const layoutOpsObj = this.spectraOps(layout);

    sample.analysesContainers().forEach((ae) => {
      if (ae.id !== selectedOpt.idAe) return;
      ae.children.forEach((ai) => {
        if (ai.id !== selectedOpt.idAi) return;
        ai.extended_metadata.content.ops = [ // eslint-disable-line
          ...ai.extended_metadata.content.ops,
          ...layoutOpsObj.head,
          { insert: result },
          ...layoutOpsObj.tail,
        ];
      });
    });
    handleSampleChanged(sample);
  }

  savePeaks(peaks) {
    const { sample, handleSubmit } = this.props;
    const { selectedOpt } = this.state;
    SpectraActions.SavePeaksToFile(sample, peaks, selectedOpt);
    handleSubmit();
    SpectraActions.ToggleModal.defer();
  }

  renderEmpty() {
    const { fetched } = this.state;
    const content = fetched
      ? (
        <Well>
          <i className="fa fa-exclamation-triangle fa-3x" />
          <h3>No Spectra Found!</h3>
          <h3>Please refresh the page!</h3>
        </Well>
      )
      : <i className="fa fa-refresh fa-spin fa-3x fa-fw" />;

    return (
      <div className="card-box">
        { content }
      </div>
    );
  }

  renderSpectraViewer() {
    const {
      selectedOpt, allSpectra, options,
    } = this.state;
    const {
      input, xLabel, yLabel, peakObjs,
    } = this.buildData(selectedOpt, allSpectra);

    return (
      <Modal.Body>
        <Select
          value={selectedOpt}
          onChange={this.onChangeSelect}
          options={options}
          clearable={false}
        />
        <SpectraViewer
          input={input}
          xLabel={xLabel}
          yLabel={yLabel}
          peakObjs={peakObjs}
          writePeaks={this.writePeaks}
          savePeaks={this.savePeaks}
        />
      </Modal.Body>
    );
  }

  render() {
    const { sample } = this.props;
    const { showModal, allSpectra } = this.state;
    const modalTitle = `Spectra Viewer - ${sample.short_label}`;

    return (
      <div className="spectra-viewer">
        <Modal
          show={showModal}
          onHide={this.onCloseModal}
          dialogClassName="spectra-viewer-dialog"
          animation
        >
          <Modal.Header closeButton>
            <Modal.Title>{ modalTitle }</Modal.Title>
          </Modal.Header>
          {
            showModal && allSpectra.length > 0
              ? this.renderSpectraViewer()
              : this.renderEmpty()
          }
        </Modal>
      </div>
    );
  }
}

ViewSpectra.propTypes = {
  sample: PropTypes.object.isRequired,
  handleSampleChanged: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

export default ViewSpectra;
