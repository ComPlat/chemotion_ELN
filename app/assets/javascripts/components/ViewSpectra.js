import React from 'react';
import { SpectraViewer, ToXY, LIST_LAYOUT } from 'react-spectra-viewer';
import { Modal, Well } from 'react-bootstrap';
import PropTypes from 'prop-types';

import SpectraActions from './actions/SpectraActions';
import SpectraStore from './stores/SpectraStore';
import { SpectraOps } from './utils/quillToolbarSymbol';
import { fixDigit } from './utils/MathUtils';

class ViewSpectra extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...SpectraStore.getState(),
    };

    this.onChange = this.onChange.bind(this);
    this.onCloseModal = this.onCloseModal.bind(this);
    this.writePeaks = this.writePeaks.bind(this);
    this.savePeaks = this.savePeaks.bind(this);
    this.renderSpectraViewer = this.renderSpectraViewer.bind(this);
    this.renderEmpty = this.renderEmpty.bind(this);
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

  onCloseModal() {
    SpectraActions.ToggleModal();
  }

  buildData(target) {
    if (!target) return { isExist: false };
    const sp = target && target.file.spectrum;
    const input = sp ? sp.data[0] : {};
    const xLabel = sp ? `X (${sp.xUnit})` : '';
    const yLabel = sp ? `Y (${sp.yUnit})` : '';
    const peakObjs = target && target.file.peakObjs;
    return {
      input, xLabel, yLabel, peakObjs, isExist: true,
    };
  }

  spectraDigit(layout) {
    switch (layout) {
      case LIST_LAYOUT.C13:
        return 1;
      case LIST_LAYOUT.IR:
        return 0;
      case LIST_LAYOUT.H1:
      case LIST_LAYOUT.PLAIN:
      default:
        return 2;
    }
  }

  convertPeaksToStr(peaks, layout) {
    const peaksXY = ToXY(peaks);
    const digit = this.spectraDigit(layout);

    const result = peaksXY.map(p => fixDigit(parseFloat(p[0]), digit));
    const ordered = result.sort((a, b) => a - b).join(', ');
    return ordered;
  }

  spectraOps(layout) {
    const layoutOps = SpectraOps[layout];
    const isArr = Array.isArray(layoutOps);
    if (isArr) {
      return { head: layoutOps, tail: [{ insert: '. ' }] };
    }
    return layoutOps;
  }

  writePeaks(peaks, layout) {
    const { sample, handleSampleChanged } = this.props;
    const { spcInfo } = this.state;
    const peaksStr = this.convertPeaksToStr(peaks, layout);
    const layoutOpsObj = this.spectraOps(layout);

    sample.analysesContainers().forEach((ae) => {
      if (ae.id !== spcInfo.idAe) return;
      ae.children.forEach((ai) => {
        if (ai.id !== spcInfo.idAi) return;
        ai.extended_metadata.content.ops = [ // eslint-disable-line
          ...ai.extended_metadata.content.ops,
          ...layoutOpsObj.head,
          { insert: peaksStr },
          ...layoutOpsObj.tail,
        ];
      });
    });
    handleSampleChanged(sample);
  }

  savePeaks(peaks, shift) {
    const { sample, handleSubmit } = this.props;
    const { spcInfo } = this.state;
    SpectraActions.SaveToFile(sample, spcInfo, peaks, shift);
    setTimeout(() => handleSubmit(), 1000);
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

  renderInvalid() {
    const { fetched } = this.state;
    const content = fetched
      ? (
        <Well>
          <i className="fa fa-chain-broken fa-3x" />
          <h3>Invalid spectrum!</h3>
          <h3>Please delete it and upload a valid file!</h3>
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
    const { jcamp } = this.state;
    const {
      input, xLabel, yLabel, peakObjs, isExist,
    } = this.buildData(jcamp);

    return (
      <Modal.Body>
        {
          !isExist
            ? this.renderInvalid()
            : <SpectraViewer
              input={input}
              xLabel={xLabel}
              yLabel={yLabel}
              peakObjs={peakObjs}
              writePeaks={this.writePeaks}
              savePeaks={this.savePeaks}
            />
        }
      </Modal.Body>
    );
  }

  render() {
    const { showModal, spcInfo, jcamp } = this.state;
    const modalTitle = spcInfo ? `Spectra Viewer - ${spcInfo.title}` : '';

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
            showModal && jcamp
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
