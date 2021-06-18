import React from 'react';
import PropTypes from 'prop-types';
import base64 from 'base-64';
import SpectraStore from '../stores/SpectraStore';
import SpectraActions from '../actions/SpectraActions';
import LoadingActions from '../actions/LoadingActions';
import { Modal, Well, Button } from 'react-bootstrap';
import { SpectraOps } from '../utils/quillToolbarSymbol';
import UIFetcher from '../fetchers/UIFetcher';

export default class NMRDisplayer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...SpectraStore.getState(),
    };

    this.iframeRef = React.createRef();

    this.onChange = this.onChange.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.handleNMRDisplayerLoaded = this.handleNMRDisplayerLoaded.bind(this);
    this.sendJcampDataToNMRDisplayer = this.sendJcampDataToNMRDisplayer.bind(this);
    this.loadNMRDisplayerHostInfo = this.loadNMRDisplayerHostInfo.bind(this);

    this.loadNMRDisplayerHostInfo();
  }

  componentDidMount() {
    SpectraStore.listen(this.onChange);

    window.addEventListener("message", this.receiveMessage)
  }

  componentWillUnmount() {
    SpectraStore.unlisten(this.onChange);
  }

  onChange(newState) {
    const origState = this.state;
    this.setState({ ...origState, ...newState });
    this.sendJcampDataToNMRDisplayer();
  }

  loadNMRDisplayerHostInfo() {
    UIFetcher.fetchNMRDisplayerHost().then((response) => {
      const {protocol, url, port} = response;
      const nmrdisplayerHost = protocol + '://' + url + ':' + port;
      this.setState({nmrdisplayerHost})
    })
  }

  formatPeaks(data) {
    const layout = data.layout;
    const layoutOpsObj = SpectraOps[layout];
    const peaksData = data.data;
    const peaks = peaksData.join(', ')
    return [
      ...layoutOpsObj.head(),
      { insert: peaks },
      ...layoutOpsObj.tail(),
    ];
  }

  formatMultiplicity(data) {
    const layout = data.layout;
    const layoutOpsObj = SpectraOps[layout];
    const rangesData = data.data.ranges;
    const rangesValues = rangesData.values;
    const signalData = rangesValues.map((range) => {
      const signal = range.signal;
      let result;
      if (signal) {
        result = signal.map((s) => {
          const value = s.delta.toFixed(2);
          const multiplicity = s.multiplicity;
          let jStr = ''
          if (s.j && s.j.length > 0) {
            const jValues = s.j.map((jVal) => {
              return jVal.coupling.toFixed(2)
            })
            jStr = jValues.join(', ');
          }

          let valStr = '';
          if (multiplicity) {
            if (jStr) {
              valStr = value + ' (' + multiplicity + ', J = ' + jStr + ' Hz)';
            }
            else {
              valStr = value + ' (' + multiplicity + ')';
            }
          }
          else if (jStr) {
            valStr = value + ' (J = ' + jStr + ' Hz)';
          }
          else {
            valStr = value;
          }
          return valStr
        })
      }
      return result;
    })

    const multiplicity = signalData.map((s) => {
      return s.join('')
    })

    const body = multiplicity.join(', ')

    return [
      ...layoutOpsObj.head(),
      { insert: body },
      ...layoutOpsObj.tail(),
    ];
  }

  getSpcInfo() {
    const { spcInfos, spcIdx } = this.state;
    const sis = spcInfos.filter(x => x.idx === spcIdx);
    const si = sis.length > 0 ? sis[0] : spcInfos[0];
    return si;
  }

  receiveMessage(event) {
    if (event.data) {
      const {sample, handleSampleChanged} = this.props;
      const data = event.data;
      const type = data.type;
      if (type === 'peaks') {
        const ops = this.formatPeaks(data)
        const si = this.getSpcInfo();
        sample.analysesContainers().forEach((ae) => {
          if (ae.id !== si.idAe) return;
          ae.children.forEach((ai) => {
            if (ai.id !== si.idAi) return;
            ai.extended_metadata.content.ops = [ // eslint-disable-line
              ...ai.extended_metadata.content.ops,
              ...ops,
            ];
          });
        });

        const cb = () => {
          //TODO: save to file
          SpectraActions.ToggleModalNMRDisplayer.defer();
        }
        handleSampleChanged(sample, cb)
      }
      else if (type === 'ranges') {
        const ops = this.formatMultiplicity(data);
        const si = this.getSpcInfo();
        sample.analysesContainers().forEach((ae) => {
          if (ae.id !== si.idAe) return;
          ae.children.forEach((ai) => {
            if (ai.id !== si.idAi) return;
            ai.extended_metadata.content.ops = [ // eslint-disable-line
              ...ai.extended_metadata.content.ops,
              ...ops,
            ];
          });
        });

        const cb = () => {
          //TODO: save to file
          SpectraActions.ToggleModalNMRDisplayer.defer();
        }
        handleSampleChanged(sample, cb)
      }
    }
  }

  handleNMRDisplayerLoaded() {
    const isIframeLoaded = true;
    this.setState({isIframeLoaded});
    this.sendJcampDataToNMRDisplayer();
  }

  sendJcampDataToNMRDisplayer() {
    LoadingActions.start.defer();
    const { fetchedFiles, isIframeLoaded } = this.state;
    if (isIframeLoaded && fetchedFiles && fetchedFiles.files.length > 0) {
      LoadingActions.stop.defer();
      const jcamp = base64.decode(fetchedFiles.files[0])

      if (this.iframeRef.current) {
        this.iframeRef.current.contentWindow.postMessage(jcamp, "*")
      }
    }
    else {
      LoadingActions.stop.defer();
    }
  }

  renderNMRium(jcampURL) {
    return (
      <Modal.Body>
        <iframe id="nmr_displayer" className="spectra-editor" 
          src={jcampURL}
          allowFullScreen={true}
          ref={this.iframeRef}
          onLoad={this.handleNMRDisplayerLoaded}></iframe>
      </Modal.Body>
    )
  }

  renderModalTitle() {
    return (
      <Modal.Header>
        <Button
          bsStyle="danger"
          bsSize="small"
          className="button-right"
          onClick={() => {
            SpectraActions.ToggleModalNMRDisplayer.defer();
          }}
        >
          <span>
            <i className="fa fa-times" /> Close without Save
          </span>
        </Button>
      </Modal.Header>
    )
  }

  render() {
    const { showModalNMRDisplayer, nmrdisplayerHost } = this.state;

    return (
      <div className="spectra-editor">
        <Modal
          show={showModalNMRDisplayer}
          dialogClassName="spectra-editor-dialog"
          animation
          onHide={this.closeOp}
        >
          {this.renderModalTitle()}
          {this.renderNMRium(nmrdisplayerHost)}
        </Modal>
      </div>
    )
  }
}