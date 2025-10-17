import React, { useContext } from 'react';
import { Form, Button } from 'react-bootstrap';

import QuillViewer from 'src/components/QuillViewer';
import { getAttachmentFromContainer } from 'src/utilities/imageHelper';
import ImageModal from 'src/components/common/ImageModal';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { BuildSpcInfos, JcampIds, BuildSpcInfosForNMRDisplayer, isNMRKind } from 'src/utilities/SpectraHelper';
import SpectraEditorButton from 'src/components/common/SpectraEditorButton';
import { instrumentText } from 'src/utilities/ElementUtils';

import { StoreContext } from 'src/stores/mobx/RootStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';

const AnalysisHeader = ({ container, readonly }) => {
  const sbmmStore = useContext(StoreContext).sequenceBasedMacromoleculeSamples;
  const sbmmSample = sbmmStore.sequence_based_macromolecule_sample;

  const handleChanged = () => {
    let sbmmSample = { ...sbmmSample };
    sbmmSample.isPendingToSave = true;
    sbmmStore.setSequenceBasedMacromolecueSample(sbmmSample);
  }

  const deleteContainer = (e) => {
    e.stopPropagation();
    if (confirm('Delete the analysis?')) {
      container.is_deleted = true;
      sbmmStore.changeAnalysisContainerContent(container);
    }
  }

  const undoDeleteContainer = (e) => {
    e.stopPropagation();
    container.is_deleted = false;
    sbmmStore.changeAnalysisContainerContent(container);
  }

  const inReport = container.extended_metadata.report;
  const toggleAddToReport = (e) => {
    e.stopPropagation();
    container.extended_metadata.report = !container.extended_metadata.report;
    sbmmStore.changeAnalysisContainerContent(container);
  };

  // spcInfos = [ { value, label, title, idSp, idAe, idx, ... }, ...]
  const spcInfos = BuildSpcInfos(sbmmSample, container);
  const toggleSpectraModal = (e) => {
    e.stopPropagation();
    SpectraActions.ToggleModal();
    SpectraActions.LoadSpectra.defer(spcInfos); // going to fetch files base on spcInfos
  };

  //process open NMRium
  const toggleNMRDisplayerModal = (e) => {
    const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(sbmmSample, container);
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

  const confirmRegenerateEdited = (e) => {
    e.stopPropagation();
    if (confirm('Regenerate edited spectra?\nWARNING: This process will override the simulated signals')) {
      LoadingActions.start();
      SpectraActions.RegenerateEdited(jcampIds, '', () => {
        LoadingActions.stop();
      });
    }
  }

  const panelButtons = () => {
    if (sbmmSample.analysis_mode == 'order') { return '' }

    if (container?.is_deleted) {
      return (
        <Button
          size="xxsm"
          variant="danger"
          onClick={(e) => { undoDeleteContainer(e) }}
        >
          <i className="fa fa-undo" />
        </Button>
      );
    } else {
      return (
        <div
          className="d-flex gap-1 align-items-center"
          onClick={(e) => e.stopPropagation()}
        >
          <Form.Check
            id={`add-sequence-based-macromolecule-${sbmmSample.id}-to-report`}
            type="checkbox"
            onClick={toggleAddToReport}
            defaultChecked={inReport}
            label="Add to Report"
            className="mx-2"
          />
          <SpectraEditorButton
            element={sbmmSample}
            hasJcamp={hasJcamp}
            spcInfos={spcInfos}
            hasChemSpectra={hasChemSpectra}
            hasEditedJcamp={hasEditedJcamp}
            toggleSpectraModal={toggleSpectraModal}
            confirmRegenerate={confirmRegenerate}
            confirmRegenerateEdited={confirmRegenerateEdited}
            toggleNMRDisplayerModal={toggleNMRDisplayerModal}
            hasNMRium={hasNMRium}
          />
          <PrintCodeButton
            element={sbmmSample}
            analyses={[container]}
            ident={container.id}
          />
          <Button
            disabled={readonly}
            size="xxsm"
            variant="danger"
            className="button-right"
            onClick={(e) => deleteContainer(e)}
          >
            <i className="fa fa-trash" />
          </Button>
        </div>
      );
    }
  }

  const hasEditedJcamp = jcampIds.edited.length > 0;
  const { hasChemSpectra, hasNmriumWrapper } = UIStore.getState();
  const { chmos } = UserStore.getState();
  const hasNMRium = isNMRKind(container, chmos) && hasNmriumWrapper;
  const kind = (container.extended_metadata.kind?.split('|')[1] || container.extended_metadata.kind)?.trim() || '';
  const instText = ` - ${instrumentText(container)}`;
  const status = container.extended_metadata.status || '';
  const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
  const contentOneLine = {
    ops: content.ops.map((x) => {
      const c = { ...x };
      if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
      return c;
    }),
  };
  const attachment = getAttachmentFromContainer(container);

  const orderClass = sbmmStore.analysis_mode == 'order' ? 'order pe-2' : '';
  const deleted = container?.is_deleted || false;

  return (
    <div className={`analysis-header w-100 d-flex gap-3 lh-base ${orderClass}`}>
      <div className="preview border d-flex align-items-center">
        {deleted
          ? <i className="fa fa-ban text-body-tertiary fs-2 text-center d-block" /> 
          : <ImageModal
            attachment={attachment}
            popObject={{
              title: container.name,
            }}
          />
        }
      </div>
      <div className={"flex-grow-1" + (deleted ? "" : " analysis-header-fade")}>
        <div className="d-flex justify-content-between align-items-center">
          <h4 className={"flex-grow-1" + (deleted ? " text-decoration-line-through" : "")}>{container.name}</h4>
          {panelButtons()}
        </div>
        <div className={deleted ? "text-body-tertiary" : ""}>
          Type: {kind}
          <br />
          Status: {status} {instText}
        </div>
        {!deleted && (
          <div className="d-flex gap-2">
            <span>Content:</span>
            <div className="flex-grow-1">
              <QuillViewer value={contentOneLine} className="p-0" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisHeader;
