import React from 'react';
import { SpectraViewer, FN } from 'react-spectra-viewer';
import { Modal, Well, Button } from 'react-bootstrap';
import PropTypes from 'prop-types';

import LoadingActions from './actions/LoadingActions';
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
    this.writeOp = this.writeOp.bind(this);
    this.writeCloseOp = this.writeCloseOp.bind(this);
    this.checkWriteOp = this.checkWriteOp.bind(this);
    this.saveOp = this.saveOp.bind(this);
    this.saveCloseOp = this.saveCloseOp.bind(this);
    this.closeOp = this.closeOp.bind(this);
    this.predictOp = this.predictOp.bind(this);
    this.checkedToWrite = this.checkedToWrite.bind(this);
    this.buildOpsByLayout = this.buildOpsByLayout.bind(this);
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
    const { writing, predictions } = newState;
    this.setState({ ...origState, ...newState });

    this.checkedToWrite(writing, predictions);
  }

  opsSolvent(shift) {
    const { label } = shift.ref;

    switch (label) {
      case false:
        return [];
      case 'CDCl$3':
        return [
          { insert: 'CDCl' },
          { insert: '3', attributes: { script: 'sub' } },
          { insert: ', ' },
        ];
      case 'C$6D$1$2':
        return [
          { insert: 'C' },
          { insert: '6', attributes: { script: 'sub' } },
          { insert: 'D' },
          { insert: '12', attributes: { script: 'sub' } },
          { insert: ', ' },
        ];
      case 'CD2Cl2':
      case 'CD$2Cl$2':
        return [
          { insert: 'CD' },
          { insert: '2', attributes: { script: 'sub' } },
          { insert: 'Cl' },
          { insert: '2', attributes: { script: 'sub' } },
          { insert: ', ' },
        ];
      case 'D$2O':
        return [
          { insert: 'D' },
          { insert: '2', attributes: { script: 'sub' } },
          { insert: 'O' },
          { insert: ', ' },
        ];
      default:
        return [{ insert: `${label}, ` }];
    }
  }

  writeOp({
    peaks, shift, scan, thres, analysis, layout, isAscend, decimal, body,
    keepPred,
  }) {
    const { sample, handleSampleChanged } = this.props;
    const { spcInfo } = this.state;
    const mBody = body || FN.peaksBody(peaks, layout, decimal, shift, isAscend);
    const layoutOpsObj = SpectraOps[layout];
    const solventOps = this.opsSolvent(shift);

    sample.analysesContainers().forEach((ae) => {
      if (ae.id !== spcInfo.idAe) return;
      ae.children.forEach((ai) => {
        if (ai.id !== spcInfo.idAi) return;
        ai.extended_metadata.content.ops = [ // eslint-disable-line
          ...ai.extended_metadata.content.ops,
          ...layoutOpsObj.head(solventOps),
          { insert: mBody },
          ...layoutOpsObj.tail(),
        ];
      });
    });

    const cb = () => (
      this.saveOp({
        peaks, shift, scan, thres, analysis, keepPred,
      })
    );
    handleSampleChanged(sample, cb);
  }

  checkedToWrite(writing, predictions) {
    if (!writing || predictions.output.result.length === 0) return null;
    const {
      peaks, shift, scan, thres, analysis, layout, isAscend, decimal,
    } = writing;

    const data = predictions.output.result[0].shifts;
    const body = FN.formatPeaksByPrediction(peaks, layout, isAscend, decimal, data);
    this.writeOp({
      peaks,
      shift,
      scan,
      thres,
      analysis,
      layout,
      isAscend,
      decimal,
      body,
      keepPred: true,
    });

    SpectraActions.WriteStop.defer();
    return null;
  }

  saveOp({
    peaks, shift, scan, thres, analysis, keepPred,
  }) {
    const { handleSubmit } = this.props;
    const { spcInfo } = this.state;
    const fPeaks = FN.rmRef(peaks, shift);
    const peaksStr = FN.toPeakStr(fPeaks);
    const predict = JSON.stringify(analysis);

    LoadingActions.start.defer();
    SpectraActions.SaveToFile.defer(
      spcInfo,
      peaksStr,
      shift,
      scan,
      thres,
      predict,
      handleSubmit,
      keepPred,
    );
  }

  closeOp() {
    SpectraActions.ToggleModal.defer();
  }

  writeCloseOp({
    peaks, shift, scan, thres, analysis, layout, isAscend, decimal,
  }) {
    this.writeOp({
      peaks, shift, scan, thres, analysis, layout, isAscend, decimal,
    });
    this.closeOp();
  }

  saveCloseOp({
    peaks, shift, scan, thres, analysis,
  }) {
    this.saveOp({
      peaks, shift, scan, thres, analysis,
    });
    this.closeOp();
  }

  predictOp({
    peaks, layout, shift,
  }) {
    const { spcInfo } = this.state;

    SpectraActions.InferRunning.defer();
    SpectraActions.InferSpectrum.defer({
      spcInfo, peaks, layout, shift,
    });
  }

  checkWriteOp({
    peaks, shift, scan, thres, analysis, layout, isAscend, decimal,
  }) {
    const cleanPeaks = FN.rmShiftFromPeaks(peaks, shift);
    LoadingActions.start.defer();
    SpectraActions.WriteStart.defer({
      shift, scan, thres, analysis, layout, isAscend, decimal, peaks: cleanPeaks,
    });
    this.predictOp({ layout, shift, peaks: cleanPeaks });
  }

  buildOpsByLayout(et) {
    const updatable = this.props.sample && this.props.sample.can_update;
    const baseOps = updatable ? [
      { name: 'write', value: this.writeOp },
      { name: 'write & close', value: this.writeCloseOp },
      { name: 'save', value: this.saveOp },
      { name: 'save & close', value: this.saveCloseOp },
    ] : [];
    const predictable = updatable && ['MS', 'INFRARED'].indexOf(et.spectrum.sTyp) < 0;
    if (predictable) {
      return [
        { name: 'check & write', value: this.checkWriteOp },
        ...baseOps,
        { name: 'predict', value: this.predictOp },
      ];
    }
    return baseOps;
  }

  renderEmpty() {
    const { fetched } = this.state;
    const content = fetched
      ? (
        <Well onClick={this.closeOp}>
          <i className="fa fa-exclamation-triangle fa-3x" />
          <h3>No Spectra Found!</h3>
          <h3>Please refresh the page!</h3>
          <br />
          <h5>Click here to close the window...</h5>
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
        <Well onClick={this.closeOp}>
          <i className="fa fa-chain-broken fa-3x" />
          <h3>Invalid spectrum!</h3>
          <h3>Please delete it and upload a valid file!</h3>
          <br />
          <h5>Click here to close the window...</h5>
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
    const { jcamp, predictions } = this.state;
    const {
      entity, isExist,
    } = FN.buildData(jcamp.file);

    const operations = this.buildOpsByLayout(entity);

    const forecast = {
      molecule: 'molecule',
      predictions,
    };

    return (
      <Modal.Body>
        {
          !isExist
            ? this.renderInvalid()
            : <SpectraViewer
              entity={entity}
              operations={operations}
              forecast={forecast}
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
          dialogClassName="spectra-viewer-dialog"
          animation
        >
          <Modal.Header>
            <Modal.Title>
              { modalTitle }
              <Button
                bsStyle="danger"
                bsSize="small"
                className="button-right"
                onClick={this.closeOp}
              >
                <span>
                  <i className="fa fa-times" /> Close without Save
                </span>
              </Button>
            </Modal.Title>
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
