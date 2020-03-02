import React from 'react';
import { SpectraEditor, FN } from 'react-spectra-editor';
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
    this.renderSpectraEditor = this.renderSpectraEditor.bind(this);
    this.renderEmpty = this.renderEmpty.bind(this);
    this.formatPks = this.formatPks.bind(this);
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

  formatPks({
    peaks, shift, layout, isAscend, decimal, body,
    isIntensity,
  }) {
    const { jcamp } = this.state;
    const { entity } = FN.buildData(jcamp.file);
    const { features } = entity;
    const { maxY, minY } = Array.isArray(features)
      ? features[0]
      : (features.editPeak || features.autoPeak);
    const boundary = { maxY, minY };
    const mBody = body || FN.peaksBody({
      peaks, layout, decimal, shift, isAscend, isIntensity, boundary,
    });
    const layoutOpsObj = SpectraOps[layout];
    const solventOps = this.opsSolvent(shift);
    return [
      ...layoutOpsObj.head(solventOps),
      { insert: mBody },
      ...layoutOpsObj.tail(),
    ];
  }

  formatMpy({
    shift, isAscend, decimal,
    integration, multiplicity, layout,
  }) {
    // obsv freq
    const { jcamp } = this.state;
    const { entity } = FN.buildData(jcamp.file);
    const { features } = entity;
    const { observeFrequency } = Array.isArray(features)
      ? features[0]
      : (features.editPeak || features.autoPeak);
    const freq = Array.isArray(observeFrequency) ? observeFrequency[0] : observeFrequency;
    const freqStr = freq ? `${parseInt(freq, 10)} MHz, ` : '';
    // multiplicity
    const { refArea, refFactor } = integration;
    const shiftVal = multiplicity.shift;
    const ms = multiplicity.stack;
    const is = integration.stack;

    const macs = ms.map((m) => {
      const { peaks, mpyType, xExtent } = m;
      const { xL, xU } = xExtent;
      const it = is.filter(i => i.xL === xL && i.xU === xU)[0] || { area: 0 };
      const area = (it.area * refFactor) / refArea;
      const center = FN.calcMpyCenter(peaks, shiftVal, mpyType);
      return Object.assign({}, m, { area, center });
    }).sort((a, b) => (isAscend ? a.center - b.center : b.center - a.center));
    const str = macs.map((m) => {
      const c = m.center.toFixed(1);
      const type = m.mpyType;
      const it = Math.round(m.area);
      const js = m.js.map(j => `J = ${j.toFixed(decimal)} Hz`).join(', ');
      const atomCount = layout === '1H' ? `, ${it}H` : '';
      return m.js.length === 0
        ? `${c} (${type}${atomCount})`
        : `${c} (${type}, ${js}${atomCount})`;
    }).join(', ');
    const { label, value, name } = shift.ref;
    const solvent = label ? `${name}, ` : '';
    return [
      { attributes: { script: 'super' }, insert: layout.slice(0, -1) },
      { insert: `${layout.slice(-1)} (${freqStr}${solvent}${value} ppm) δ = ${str}.` },
    ];
  }

  writeOp({
    peaks, shift, scan, thres, analysis, layout, isAscend, decimal, body,
    keepPred, isIntensity, multiplicity, integration,
  }) {
    const { sample, handleSampleChanged } = this.props;
    const { spcInfo } = this.state;

    let ops = [];
    if (['1H', '13C', '19F'].indexOf(layout) >= 0) {
      ops = this.formatMpy({
        multiplicity, integration, shift, isAscend, decimal, layout,
      });
    } else {
      ops = this.formatPks({
        peaks,
        shift,
        layout,
        isAscend,
        decimal,
        body,
        isIntensity,
      });
    }

    sample.analysesContainers().forEach((ae) => {
      if (ae.id !== spcInfo.idAe) return;
      ae.children.forEach((ai) => {
        if (ai.id !== spcInfo.idAi) return;
        ai.extended_metadata.content.ops = [ // eslint-disable-line
          ...ai.extended_metadata.content.ops,
          ...ops,
        ];
      });
    });

    const cb = () => (
      this.saveOp({
        peaks, shift, scan, thres, analysis, keepPred, integration, multiplicity,
      })
    );
    handleSampleChanged(sample, cb);
  }

  checkedToWrite(writing, predictions) {
    if (!writing || predictions.output.result.length === 0) return null;
    const {
      peaks, shift, scan, thres, analysis, layout, isAscend, decimal,
      isIntensity, multiplicity, integration,
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
      isIntensity,
      multiplicity,
      integration,
    });

    SpectraActions.WriteStop.defer();
    return null;
  }

  saveOp({
    peaks, shift, scan, thres, analysis, keepPred, integration, multiplicity,
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
      JSON.stringify(integration),
      JSON.stringify(multiplicity),
      predict,
      handleSubmit,
      keepPred,
    );
  }

  closeOp() {
    SpectraActions.ToggleModal.defer();
  }

  writeCloseOp({
    peaks, shift, scan, thres, analysis, layout, isAscend, decimal, body,
    keepPred, isIntensity, multiplicity, integration,
  }) {
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
      keepPred,
      isIntensity,
      multiplicity,
      integration,
    });
    this.closeOp();
  }

  saveCloseOp({
    peaks, shift, scan, thres, analysis, integration, multiplicity,
  }) {
    this.saveOp({
      peaks, shift, scan, thres, analysis, integration, multiplicity,
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
    multiplicity, integration,
  }) {
    const cleanPeaks = FN.rmShiftFromPeaks(peaks, shift);
    LoadingActions.start.defer();
    SpectraActions.WriteStart.defer({
      shift, scan, thres, analysis, layout, isAscend, decimal, peaks: cleanPeaks,
      multiplicity, integration,
    }); // keep payload to state.writing & handle by onChange/checkedToWrite after predictOp
    this.predictOp({ layout, shift, peaks: cleanPeaks });
  }

  buildOpsByLayout(et) {
    const updatable = this.props.sample && this.props.sample.can_update;
    const baseOps = updatable ? [
      { name: 'write & save', value: this.writeOp },
      { name: 'write, save & close', value: this.writeCloseOp },
      { name: 'save', value: this.saveOp },
      { name: 'save & close', value: this.saveCloseOp },
    ] : [];
    // { name: 'check & write', value: this.checkWriteOp },
    const predictable = updatable && ['MS', 'INFRARED'].indexOf(et.spectrum.sTyp) < 0;
    if (predictable) {
      return [
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

  renderSpectraEditor() {
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
            : <SpectraEditor
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
    const modalTitle = spcInfo ? `Spectra Editor - ${spcInfo.title}` : '';

    return (
      <div className="spectra-editor">
        <Modal
          show={showModal}
          dialogClassName="spectra-editor-dialog"
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
              ? this.renderSpectraEditor()
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
