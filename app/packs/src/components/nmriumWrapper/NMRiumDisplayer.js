import React from 'react';
import base64 from 'base-64';
import SpectraStore from 'src/stores/alt/stores/SpectraStore';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { Modal, Button } from 'react-bootstrap';
import UIFetcher from 'src/fetchers/UIFetcher';
import { parseBase64ToArrayBuffer } from 'src/utilities/FetcherHelper';
import Attachment from 'src/models/Attachment';
import { SpectraOps } from 'src/utilities/quillToolbarSymbol';
import { FN } from '@complat/react-spectra-editor';

export default class NMRiumDisplayer extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      ...SpectraStore.getState(),
      nmriumData: null,
    };

    this.iframeRef = React.createRef();

    this.onChange = this.onChange.bind(this);
    this.receiveMessage = this.receiveMessage.bind(this);
    this.handleNMRDisplayerLoaded = this.handleNMRDisplayerLoaded.bind(this);
    this.sendJcampDataToNMRDisplayer = this.sendJcampDataToNMRDisplayer.bind(this);
    this.loadNMRDisplayerHostInfo = this.loadNMRDisplayerHostInfo.bind(this);
    this.requestDataToBeSaved = this.requestDataToBeSaved.bind(this);
    this.requestPreviewImage = this.requestPreviewImage.bind(this);
    this.savingNMRiumWrapperData = this.savingNMRiumWrapperData.bind(this);
    this.saveOp = this.saveOp.bind(this);

    this.findDisplayingSpectra = this.findDisplayingSpectra.bind(this);
    this.findDisplayingSpectrumID = this.findDisplayingSpectrumID.bind(this);
    this.buildPeaksBody = this.buildPeaksBody.bind(this);
    this.readNMRiumData = this.readNMRiumData.bind(this);

    this.loadNMRDisplayerHostInfo();
  }

  componentDidMount() {
    SpectraStore.listen(this.onChange);

    window.addEventListener('message', this.receiveMessage);
  }

  componentWillUnmount() {
    SpectraStore.unlisten(this.onChange);
  }

  handleNMRDisplayerLoaded() {
    const isIframeLoaded = true;
    this.setState({
      isIframeLoaded,
    }, () => {
      this.sendJcampDataToNMRDisplayer();
    });
  }

  onChange(newState) {
    const origState = this.state;
    this.setState({ ...origState, ...newState });
    this.sendJcampDataToNMRDisplayer();
  }

  getSpcInfo() {
    const { spcInfos, spcIdx } = this.state;
    const sis = spcInfos.filter((x) => x.idx === spcIdx);
    const si = sis.length > 0 ? sis[0] : spcInfos[0];
    return si;
  }

  loadNMRDisplayerHostInfo() {
    UIFetcher.fetchNMRDisplayerHost().then((response) => {
      const { nmrium_url } = response;
      if (nmrium_url) {
        const url = new URL(nmrium_url);
        const nmriumOrigin = url.origin;
        const nmriumWrapperHost = nmrium_url;
        this.setState({ nmriumWrapperHost, nmriumOrigin });
      }
    });
  }

  receiveMessage(event) {
    const { nmriumWrapperHost, nmriumOrigin } = this.state;
    if (nmriumWrapperHost === undefined || nmriumWrapperHost === '') {
      return;
    }

    if (event.origin === nmriumOrigin && event.data) {
      const eventData = event.data;
      const eventDataType = eventData.type;

      if (eventDataType === 'nmr-wrapper:data-change') {
        const nmrWrapperActionType = eventData.data.actionType;
        if (nmrWrapperActionType !== '') {
          const nmriumData = (eventData.data?.state || eventData.data) || null;
          
          if (!nmriumData) {
            return;
          }
          
          const { version } = nmriumData;
          if (version > 3) {
            this.setState({ nmriumData: nmriumData.data });
          } else {
            this.setState({ nmriumData });
          }
        }
      } else if (eventDataType === 'nmr-wrapper:action-response') {
        const nmrWrapperDataType = eventData.data.type;
        if (nmrWrapperDataType === 'exportSpectraViewerAsBlob') {
          const blobData = eventData.data.data.blob;
          this.savingNMRiumWrapperData(blobData);
        }
      }
    }
  }

  requestDataToBeSaved() {
    this.requestPreviewImage();
  }

  requestPreviewImage() {
    const iframeCurrent = this.iframeRef.current;
    if (!iframeCurrent) {
      return;
    }
    const { contentWindow } = iframeCurrent;
    const dataToBeSent = {
      type: 'exportSpectraViewerAsBlob',
    };
    contentWindow.postMessage({ type: 'nmr-wrapper:action-request', data: dataToBeSent }, '*');
  }

  sendJcampDataToNMRDisplayer() {
    LoadingActions.start.defer();
    const { fetchedFiles, isIframeLoaded, spcInfos } = this.state;
    if (isIframeLoaded && fetchedFiles && fetchedFiles.files && fetchedFiles.files.length > 0) {
      LoadingActions.stop.defer();

      const listFileContents = fetchedFiles.files;
      if (this.iframeRef.current
        && listFileContents.length > 0
        && listFileContents.length === spcInfos.length) {
        const dataToBeSent = this.buildDataToBeSent(listFileContents, spcInfos);
        const { contentWindow } = this.iframeRef.current;
        if (contentWindow) {
          contentWindow.postMessage({ type: 'nmr-wrapper:load', data: dataToBeSent }, '*');
        }
      }
    } else {
      LoadingActions.stop.defer();
    }
  }

  buildDataToBeSent(files, spectraInfos) {
    const { sample } = this.props;
    const nmriumData = this.readNMRiumData(files, spectraInfos);
    if (nmriumData) {
      const data = { data: nmriumData, type: 'nmrium' };
      return data;
    }

    const data = { data: [], type: 'file' };
    for (let index = 0; index < files.length; index += 1) {
      const fileToBeShowed = files[index].file;
      const bufferData = parseBase64ToArrayBuffer(fileToBeShowed);
      const spcInfo = spectraInfos[index];
      const fileName = spcInfo.label;
      const blobToBeSent = new Blob([bufferData]);
      const dataItem = new File([blobToBeSent], fileName);
      data.data.push(dataItem);
    }
    if (sample) {
      const { molfile } = sample;
      const fileName =`${sample.id}.mol`;
      const blobToBeSent = new Blob([molfile]);
      const dataItem = new File([blobToBeSent], fileName);
      data.data.push(dataItem);
    }
    return data;
  }

  readNMRiumData(files, spectraInfos) {
    const arrNMRiumSpecs = spectraInfos.filter((spc) => spc.label.includes('.nmrium'));
    if (!arrNMRiumSpecs || arrNMRiumSpecs.length === 0) {
      return false;
    }

    const nmriumSpec = arrNMRiumSpecs[0];

    const arrNMRiumFiles = files.filter((file) => file.id === nmriumSpec.idx);
    if (!arrNMRiumFiles || arrNMRiumFiles.length === 0) {
      return false;
    }

    const nmriumDataEncoded = arrNMRiumFiles[0].file;
    const decodedData = base64.decode(nmriumDataEncoded);
    const nmriumData = JSON.parse(decodedData);
    return nmriumData;
  }

  savingNMRiumWrapperData(imageBlobData = false) {
    const { nmriumData } = this.state;
    if (nmriumData === null || !imageBlobData) {
      return;
    }

    const specInfo = this.getSpcInfo();
    if (!specInfo) {
      return;
    }

    const { label } = specInfo;
    const specLabelParts = label.split('.');
    const fileNameWithoutExt = specLabelParts[0];

    const imageAttachment = this.prepareImageAttachment(imageBlobData, fileNameWithoutExt);
    const nmriumAttachment = this.prepareNMRiunDataAttachment(nmriumData, fileNameWithoutExt);
    const listFileNameToBeDeleted = [imageAttachment.filename, nmriumAttachment.filename];
    const datasetToBeUpdated = this.prepareDatasets(listFileNameToBeDeleted);
    if (!datasetToBeUpdated) {
      return;
    }

    this.prepareAnalysisMetadata(nmriumData);

    const { sample, handleSampleChanged } = this.props;

    datasetToBeUpdated.attachments.push(imageAttachment);
    datasetToBeUpdated.attachments.push(nmriumAttachment);

    const cb = () => (
      this.saveOp()
    );
    handleSampleChanged(sample, cb);
  }

  prepareDatasets(fileNameToBeDeleted = []) {
    const specInfo = this.getSpcInfo();
    const { sample } = this.props;

    const datasetContainers = sample.datasetContainers();
    const listDatasetFiltered = datasetContainers.filter((e) => specInfo.idDt === e.id);
    if (listDatasetFiltered.length === 0) {
      return false;
    }

    const datasetToBeUpdated = listDatasetFiltered[0];
    const datasetAttachments = datasetToBeUpdated.attachments;
    datasetAttachments.forEach((att) => {
      if (fileNameToBeDeleted.includes(att.filename)) {
        att.is_deleted = true;
      }
    });
    datasetToBeUpdated.attachments = datasetAttachments;
    return datasetToBeUpdated;
  }

  prepareNMRiunDataAttachment(nmriumData, fileNameNoExt) {
    const spaceIndent = 0;
    const dataAsJson = JSON.stringify(
      nmriumData,
      (key, value) => (ArrayBuffer.isView(value) ? Array.from(value) : value),
      spaceIndent,
    );
    const blobData = new Blob([dataAsJson], { type: 'text/plain' });
    const fileName = `${fileNameNoExt}.nmrium`;
    blobData.name = fileName;
    const dataAttachment = Attachment.fromFile(blobData);
    return dataAttachment;
  }

  prepareImageAttachment(blobData, fileNameNoExt) {
    const fileName = `${fileNameNoExt}.svg`;
    const blobDataToBeSaved = blobData;
    blobDataToBeSaved.name = fileName;
    const imageAttachment = Attachment.fromFile(blobDataToBeSaved);
    imageAttachment.thumb = true;
    return imageAttachment;
  }

  prepareAnalysisMetadata(nmriumData) {
    const buildPeaksBodyObject = this.buildPeaksBody(nmriumData);
    const { peaksBody, layout } = buildPeaksBodyObject;

    if (peaksBody === '' || layout === '') {
      return '';
    }

    const layoutOpsObj = SpectraOps[layout];

    if (!layoutOpsObj) {
      return '';
    }

    const { sample } = this.props;
    const specInfo = this.getSpcInfo();

    const analysesContainers = sample.analysesContainers();

    const ops = [
      ...layoutOpsObj.head(''),
      { insert: peaksBody },
      ...layoutOpsObj.tail(),
    ];
    analysesContainers.forEach((analyses) => {
      if (analyses.id !== specInfo.idAe) return;
      analyses.children.forEach((ai) => {
        if (ai.id !== specInfo.idAi) return;
        ai.extended_metadata.content.ops = [ // eslint-disable-line
          ...ai.extended_metadata.content.ops,
          ...ops,
        ];
      });
    });
  }

  buildPeaksBody(nmriumData) {
    const displayingSpectra = this.findDisplayingSpectra(nmriumData);
    if (displayingSpectra.length <= 0) {
      return { peaksBody: '', layout: '' };
    }

    const firstSpectrum = displayingSpectra[0];
    const { info } = firstSpectrum;
    if (info) {
      const { dimension } = info;
      if (dimension === 2) {
        return { peaksBody: '', layout: '' };
      }
    }

    const firstSpectrumPeaks = firstSpectrum.peaks;
    const { values } = firstSpectrumPeaks;
    const peaks = values;
    const layout = firstSpectrum.nucleus;
    const shift = { enable: false, peak: false, ref: { label: false, name: '---', value: 0 } };
    const decimal = 2;
    const peaksBody = FN.peaksBody({
      peaks, layout, decimal, shift
    });
    return { peaksBody, layout };
  }

  findDisplayingSpectra(nmriumData) {
    const { spectra, correlations } = nmriumData;
    const displayingSpectrumID = this.findDisplayingSpectrumID(correlations);
    if (displayingSpectrumID) {
      const displayingSpectra = spectra.filter((spectrum) => {
        const { id } = spectrum;
        return id === displayingSpectrumID;
      });
      return displayingSpectra;
    }

    const nonFIDSpectra = spectra.filter((spectrum) => {
      const { info } = spectrum;
      const { isFid } = info;
      return isFid === false;
    });
    return nonFIDSpectra;
  }

  findDisplayingSpectrumID(correlations) {
    if (!correlations) {
      return false;
    }

    try {
      const { values } = correlations;
      if (values.length > 0) {
        const firstValue = values[0];
        const { link } = firstValue;
        if (link.length > 0) {
          const firstLink = link[0];
          const { experimentID } = firstLink;
          return experimentID;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  saveOp() {
    SpectraActions.ToggleModalNMRDisplayer.defer();
    const { handleSubmit } = this.props;
    handleSubmit()
  }

  renderNMRium(nmriumWrapperHost) {
    return (
      <Modal.Body>
        <iframe
          id="nmrium_wrapper"
          className="spectra-editor"
          src={nmriumWrapperHost}
          allowFullScreen
          ref={this.iframeRef}
          onLoad={this.handleNMRDisplayerLoaded}
        />
      </Modal.Body>
    );
  }

  renderModalTitle() {
    const { nmriumData } = this.state;
    let hasSpectra = false;
    if (nmriumData && nmriumData.spectra.length > 0) {
      hasSpectra = true;
    }

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
            <i className="fa fa-times" />
            {' '}
            Close without Save
          </span>
        </Button>
        {
          hasSpectra ?
          (
            <Button
              bsStyle="success"
              bsSize="small"
              className="button-right"
              onClick={() => {
                this.requestDataToBeSaved()
              }}
            >
              <span>
                <i className="fa fa-floppy-o" />
                {' '}
                Close with Save
              </span>
            </Button>
          ) : null
        }
      </Modal.Header>
    );
  }

  render() {
    const { showModalNMRDisplayer, nmriumWrapperHost } = this.state;

    return (
      <div className="spectra-editor">
        <Modal
          show={showModalNMRDisplayer}
          dialogClassName="spectra-editor-dialog"
          animation
          onHide={this.closeOp}
        >
          {this.renderModalTitle()}
          {this.renderNMRium(nmriumWrapperHost)}
        </Modal>
      </div>
    );
  }
}
