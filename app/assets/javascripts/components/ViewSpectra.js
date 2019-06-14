import React from 'react';
import { SpectraViewer, FN } from 'react-spectra-viewer';
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
    this.onCloseModal = this.onCloseModal.bind(this);
    this.writeOp = this.writeOp.bind(this);
    this.saveOp = this.saveOp.bind(this);
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
    peaks, layout, shift, isAscend,
  }) {
    const { sample, handleSampleChanged } = this.props;
    const { spcInfo } = this.state;
    const body = FN.peaksBody(peaks, layout, shift, isAscend);
    const layoutOpsObj = SpectraOps[layout];
    const solventOps = this.opsSolvent(shift);

    sample.analysesContainers().forEach((ae) => {
      if (ae.id !== spcInfo.idAe) return;
      ae.children.forEach((ai) => {
        if (ai.id !== spcInfo.idAi) return;
        ai.extended_metadata.content.ops = [ // eslint-disable-line
          ...ai.extended_metadata.content.ops,
          ...layoutOpsObj.head(solventOps),
          { insert: body },
          ...layoutOpsObj.tail(),
        ];
      });
    });

    const cb = () => this.saveOp({ peaks, shift });
    handleSampleChanged(sample, cb);
  }

  saveOp({ peaks, shift }) { // TBD: scan, thres
    const { sample, handleSubmit } = this.props;
    const { spcInfo } = this.state;
    const fPeaks = FN.rmRef(peaks, shift);

    SpectraActions.SaveToFile(
      sample,
      spcInfo,
      fPeaks,
      shift,
      handleSubmit,
    );
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
      entity, isExist,
    } = FN.buildData(jcamp.file);

    const operations = [
      { name: 'write', value: this.writeOp },
      { name: 'save', value: this.saveOp },
    ].filter(r => r.value);

    const predictObj = {
      btnCb: null,
      inputCb: null,
      molecule: null,
      predictions: null,
    };

    return (
      <Modal.Body>
        {
          !isExist
            ? this.renderInvalid()
            : <SpectraViewer
              entity={entity}
              operations={operations}
              predictObj={predictObj}
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
