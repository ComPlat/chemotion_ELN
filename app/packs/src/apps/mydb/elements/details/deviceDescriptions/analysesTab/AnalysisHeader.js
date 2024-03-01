import React, { useContext } from 'react';
import { Button, Checkbox } from 'react-bootstrap';

import QuillViewer from 'src/components/QuillViewer';
import { previewContainerImage } from 'src/utilities/imageHelper';
import ImageModal from 'src/components/common/ImageModal';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import { stopBubble } from 'src/utilities/DomHelper';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { BuildSpcInfos, JcampIds, BuildSpcInfosForNMRDisplayer, isNMRKind } from 'src/utilities/SpectraHelper';
import SpectraEditorButton from 'src/components/common/SpectraEditorButton';

import { StoreContext } from 'src/stores/mobx/RootStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';

const AnalysisHeader = ({ container, readonly }) => {
  const deviceDescriptionsStore = useContext(StoreContext).deviceDescriptions;
  const deviceDescription = deviceDescriptionsStore.device_description;

  const handleChanged = () => {
    let device_description = { ...deviceDescription };
    device_description.isPendingToSave = true;
    deviceDescriptionsStore.setDeviceDescription(device_description);
  }

  const deleteContainer = (e) => {
    e.stopPropagation();
    if (confirm('Delete the analysis?')) {
      container.is_deleted = true;
      deviceDescriptionsStore.changeAnalysisContainerContent(container);
    }
  }

  const undoDeleteContainer = (e) => {
    e.stopPropagation();
    container.is_deleted = false;
    deviceDescriptionsStore.changeAnalysisContainerContent(container);
  }

  const inReport = container.extended_metadata.report;
  const toggleAddToReport = (e) => {
    e.stopPropagation();
    container.extended_metadata.report = !container.extended_metadata.report;
    deviceDescriptionsStore.changeAnalysisContainerContent(container);
  };

  // spcInfos = [ { value, label, title, idSp, idAe, idx, ... }, ...]
  const spcInfos = BuildSpcInfos(deviceDescription, container);
  const toggleSpectraModal = (e) => {
    e.stopPropagation();
    SpectraActions.ToggleModal();
    SpectraActions.LoadSpectra.defer(spcInfos); // going to fetch files base on spcInfos
  };

  //process open NMRium
  const toggleNMRDisplayerModal = (e) => {
    const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(deviceDescription, container);
    e.stopPropagation();
    SpectraActions.ToggleModalNMRDisplayer();
    SpectraActions.LoadSpectraForNMRDisplayer.defer(spcInfosForNMRDisplayer); // going to fetch files base on spcInfos
  }

  const jcampIds = JcampIds(container);
  const hasJcamp = jcampIds.orig.length > 0;
  const confirmRegenerate = (e) => {
    e.stopPropagation();
    if (confirm('Regenerate spectra?')) {
      LoadingActions.start();
      SpectraActions.Regenerate(jcampIds, handleChanged());
    }
  };

  const hasEditedJcamp = jcampIds.edited.length > 0;
  const { hasChemSpectra, hasNmriumWrapper } = UIStore.getState();
  const { chmos } = UserStore.getState();
  const hasNMRium = isNMRKind(container, chmos) && hasNmriumWrapper;

  const imagePreview = () => {
    const previewImg = previewContainerImage(container);
    const fetchNeeded = false;
    const fetchId = 1;

    return (
      <div className="preview">
        <ImageModal
          hasPop={false}
          previewObject={{
            src: previewImg
          }}
          popObject={{
            title: container.name,
            src: previewImg,
            fetchNeeded,
            fetchId
          }}
        />
      </div>
    );
  }

  const panelButtons = () => {
    if (deviceDescriptionsStore.analysis_mode == 'order') { return '' }

    if (container?.is_deleted) {
      return (
        <Button
          className="pull-right"
          bsSize="xsmall"
          bsStyle="danger"
          onClick={(e) => undoDeleteContainer(e)}
        >
          <i className="fa fa-undo" />
        </Button>
      );
    } else {
      return (
        <div className="upper-btn">
          <Button
            disabled={readonly}
            bsSize="xsmall"
            bsStyle="danger"
            className="button-right"
            onClick={(e) => deleteContainer(e)}
          >
            <i className="fa fa-trash" />
          </Button>
          <PrintCodeButton
            element={deviceDescription}
            analyses={[container]}
            ident={container.id}
          />
          <SpectraEditorButton
            element={deviceDescription}
            hasJcamp={hasJcamp}
            spcInfos={spcInfos}
            hasChemSpectra={hasChemSpectra}
            hasEditedJcamp={hasEditedJcamp}
            toggleSpectraModal={toggleSpectraModal}
            confirmRegenerate={confirmRegenerate}
            toggleNMRDisplayerModal={toggleNMRDisplayerModal}
            hasNMRium={hasNMRium}
          />
          <span
            className="button-right add-to-report"
            onClick={stopBubble}
          >
            <Checkbox
              onClick={toggleAddToReport}
              defaultChecked={inReport}
            >
              <span>Add to Report</span>
            </Checkbox>
          </span>
        </div>
      );
    }
  }

  const titleContent = () => {
    const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
    const contentOneLine = {
      ops: content.ops.map((x) => {
        const c = { ...x };
        if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
        return c;
      }),
    };
    return (
      <div className="desc sub-title">
        <span style={{ float: 'left', marginRight: '5px' }}>
          Content:
        </span>
        <QuillViewer value={contentOneLine} preview />
      </div>
    );
  }

  const panelHeader = () => {
    const kind = (container.extended_metadata.kind?.split('|')[1] || container.extended_metadata.kind)?.trim() || '';
    const titleKind = `Type: ${kind}`;
    const status = container.extended_metadata.status || '';
    const titleStatus = `Status: ${status}`;
    const titleStriked =
      [container.name, titleKind, titleStatus].filter(n => n != 'Type: ' && n != 'Status: ').join(' - ');
    const headerClass = deviceDescriptionsStore.analysis_mode == 'order' ? 'analysis-header order' : 'analysis-header';

    if (container?.is_deleted) {
      return (
        <div className="analysis-header-delete">
          <strike>
            {titleStriked}
          </strike>
          {panelButtons()}
        </div>
      );
    } else {
      return (
        <div className={headerClass}>
          <div className="preview">{imagePreview()}</div>
          <div className="abstract">
            {panelButtons()}
            <div className="lower-text">
              <div className="main-title">{container.name}</div>
              <div className="sub-title">{titleKind}</div>
              <div className="sub-title">{titleStatus}</div>
              {titleContent()}
            </div>
          </div>
        </div>
      );
    }
  }

  return panelHeader();
}

export default AnalysisHeader;
