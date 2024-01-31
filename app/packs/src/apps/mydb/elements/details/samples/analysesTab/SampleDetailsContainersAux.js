/* eslint-disable react/function-component-definition */
/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { Button, Checkbox } from 'react-bootstrap';
import QuillViewer from 'src/components/QuillViewer';
import PrintCodeButton from 'src/components/common/PrintCodeButton';
import { stopBubble } from 'src/utilities/DomHelper';
import ImageModal from 'src/components/common/ImageModal';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import {
  BuildSpcInfos, JcampIds, BuildSpcInfosForNMRDisplayer, isNMRKind
} from 'src/utilities/SpectraHelper';
import {
  hNmrCheckMsg, cNmrCheckMsg, msCheckMsg, instrumentText
} from 'src/utilities/ElementUtils';
import { contentToText } from 'src/utilities/quillFormat';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import { chmoConversions } from 'src/components/OlsComponent';
import { previewContainerImage } from 'src/utilities/imageHelper';
import SpectraEditorButton from 'src/components/common/SpectraEditorButton';

const qCheckPass = () => (
  <div style={{ display: 'inline', color: 'green' }}>
    &nbsp;
    <i className="fa fa-check" />
  </div>
);

const qCheckFail = (msg, kind, atomNum = '') => (
  <div style={{ display: 'inline', color: 'red' }}>
    &nbsp;
    (
    <sup>{atomNum}</sup>
    {kind}
    &nbsp;
    {msg}
    )
  </div>
);

const qCheckMsg = (sample, container) => {
  if (sample.molecule && container.extended_metadata
    && ((typeof container.extended_metadata.kind === 'undefined' || container.extended_metadata.kind == null
      || container.extended_metadata.kind.split('|').length < 2)
      || (container.extended_metadata.kind.split('|')[0].trim() !== chmoConversions.nmr_1h.termId
        && container.extended_metadata.kind.split('|')[0].trim() !== chmoConversions.nmr_13c.termId
        && !container.extended_metadata.kind.split('|')[1].includes('mass spectrometry'))
    )) {
    return '';
  }
  const str = container.extended_metadata && contentToText(container.extended_metadata.content);

  if (container.extended_metadata.kind.split('|')[0].trim() === chmoConversions.nmr_1h.termId) {
    const msg = hNmrCheckMsg(sample.molecule_formula, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'H', '1');
  } if (container.extended_metadata.kind.split('|')[0].trim() === chmoConversions.nmr_13c.termId) {
    const msg = cNmrCheckMsg(sample.molecule_formula, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'C', '13');
  } if (container.extended_metadata.kind.split('|')[1].includes('mass spectrometry')) {
    const msg = msCheckMsg(sample.molecule.exact_molecular_weight, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'MS', '');
  }
  return '';
};

const editModeBtn = (toggleMode, isDisabled) => (
  <Button
    bsSize="xsmall"
    bsStyle="primary"
    onClick={toggleMode}
    disabled={isDisabled}
  >
    <span>
      <i className="fa fa-edit" />
      &nbsp;
      Edit mode
    </span>
  </Button>
);

const orderModeBtn = (toggleMode, isDisabled) => (
  <Button
    bsSize="xsmall"
    bsStyle="success"
    onClick={toggleMode}
    disabled={isDisabled}
  >
    <span>
      <i className="fa fa-reorder" />
      &nbsp;
      Order mode
    </span>
  </Button>
);

export const AnalysisModeBtn = (mode, toggleMode, isDisabled) => {
  switch (mode) {
    case 'order':
      return orderModeBtn(toggleMode, isDisabled);
    default:
      return editModeBtn(toggleMode, isDisabled);
  }
};

AnalysisModeBtn.propTypes = {
  mode: PropTypes.string.isRequired,
  toggleMode: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
};

const undoBtn = (container, mode, handleUndo) => {
  const clickUndo = () => handleUndo(container);

  if (mode === 'edit') {
    return (
      <Button
        className="pull-right"
        bsSize="xsmall"
        bsStyle="danger"
        onClick={clickUndo}
      >
        <i className="fa fa-undo" />
      </Button>
    );
  }
  return null;
};

export const HeaderDeleted = ({ container, handleUndo, mode }) => {
  const mKind = container.extended_metadata.kind;
  const mStatus = container.extended_metadata.status;
  const kind = (mKind && mKind !== '') ? ` - Type: ${(mKind.split('|')[1] || mKind).trim()}` : '';
  const status = (mStatus && mStatus !== '') ? ` - Status: ${mStatus}` : '';

  return (
    <div className="analysis-header-delete">
      <strike>
        {container.name}
        {kind}
        {status}
      </strike>
      <div className="button-right undo-middle">
        {undoBtn(container, mode, handleUndo)}
      </div>
    </div>
  );
};

HeaderDeleted.propTypes = {
  container: PropTypes.object.isRequired,
  handleUndo: PropTypes.func.isRequired,
  mode: PropTypes.string.isRequired,
};

const headerBtnGroup = (
  container,
  sample,
  mode,
  handleRemove,
  handleSubmit,
  toggleAddToReport,
  isDisabled,
  readOnly,
) => {
  if (mode !== 'edit') {
    return null;
  }

  const inReport = container.extended_metadata.report;
  const confirmDelete = (e) => {
    e.stopPropagation();
    if (confirm('Delete the analysis?')) {
      handleRemove(container);
    }
  };
  const onToggleAddToReport = (e) => {
    e.stopPropagation();
    toggleAddToReport(container);
  };

  // spcInfos = [ { value, label, title, idSp, idAe, idx, ... }, ...]
  const spcInfos = BuildSpcInfos(sample, container);
  const toggleSpectraModal = (e) => {
    e.stopPropagation();
    SpectraActions.ToggleModal();
    SpectraActions.LoadSpectra.defer(spcInfos); // going to fetch files base on spcInfos
  };

  // process open NMRium
  const toggleNMRDisplayerModal = (e) => {
    const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(sample, container);
    e.stopPropagation();
    SpectraActions.ToggleModalNMRDisplayer();
    SpectraActions.LoadSpectraForNMRDisplayer.defer(spcInfosForNMRDisplayer); // going to fetch files base on spcInfos
  };

  const jcampIds = JcampIds(container);
  const hasJcamp = jcampIds.orig.length > 0;
  const confirmRegenerate = (e) => {
    e.stopPropagation();
    if (confirm('Regenerate spectra?')) {
      LoadingActions.start();
      SpectraActions.Regenerate(jcampIds, handleSubmit);
    }
  };

  const hasEditedJcamp = jcampIds.edited.length > 0;
  const confirmRegenerateEdited = (e) => {
    e.stopPropagation();
    if (confirm('Regenerate edited spectra?\nWARNING: This process will override the simulated signals')) {
      LoadingActions.start();
      SpectraActions.RegenerateEdited(jcampIds, sample.molfile, () => {
        LoadingActions.stop();
      });
    }
  };

  const { hasChemSpectra, hasNmriumWrapper } = UIStore.getState();
  const { chmos } = UserStore.getState();
  const hasNMRium = isNMRKind(container, chmos) && hasNmriumWrapper;

  return (
    <div className="upper-btn">
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        className="button-right"
        disabled={readOnly || isDisabled}
        onClick={confirmDelete}
      >
        <i className="fa fa-trash" />
      </Button>
      <PrintCodeButton
        element={sample}
        analyses={[container]}
        ident={container.id}
      />
      <SpectraEditorButton
        element={sample}
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
      <span
        className="button-right add-to-report"
        onClick={stopBubble}
      >
        <Checkbox
          onClick={onToggleAddToReport}
          defaultChecked={inReport}
        >
          <span>Add to Report</span>
        </Checkbox>
      </span>
    </div>
  );
};

export const HeaderNormal = ({
  sample, container, mode, readOnly, isDisabled, serial,
  handleRemove, handleSubmit, handleAccordionOpen, toggleAddToReport,
}) => {
  const clickToOpen = () => handleAccordionOpen(serial);

  let kind = container.extended_metadata.kind || '';
  kind = (kind.split('|')[1] || kind).trim();
  const insText = instrumentText(container);
  const status = container.extended_metadata.status || '';
  const previewImg = previewContainerImage(container);
  const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
  const contentOneLine = {
    ops: content.ops.map((x) => {
      const c = { ...x };
      if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
      return c;
    }),
  };
  let hasPop = true;
  let fetchNeeded = false;
  let fetchId = 0;
  if (previewImg.startsWith('data:image')) {
    fetchNeeded = true;
    fetchId = container.preview_img.id;
  } else {
    hasPop = false;
  }
  return (
    <div
      className={`analysis-header ${mode === 'edit' ? '' : 'order'}`}
      onClick={clickToOpen}
    >
      <div className="preview">
        <ImageModal
          hasPop={hasPop}
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
      <div className="abstract">
        {
          headerBtnGroup(
            container,
            sample,
            mode,
            handleRemove,
            handleSubmit,
            toggleAddToReport,
            isDisabled,
            readOnly,
          )
        }
        <div className="lower-text">
          <div className="main-title">{container.name}</div>
          <div className="sub-title">
            Type:&nbsp;
            {kind}
          </div>
          <div className="sub-title">
            Status: {status} {qCheckMsg(sample, container)} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {insText}
          </div>
          <div className="desc sub-title">
            <span style={{ float: 'left', marginRight: '5px' }}>
              Content:
            </span>
            <QuillViewer value={contentOneLine} />
          </div>
        </div>
      </div>
    </div>
  );
};

HeaderNormal.propTypes = {
  sample: PropTypes.object.isRequired,
  container: PropTypes.object.isRequired,
  mode: PropTypes.string.isRequired,
  readOnly: PropTypes.bool.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  serial: PropTypes.number.isRequired,
  handleRemove: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleAccordionOpen: PropTypes.func.isRequired,
  toggleAddToReport: PropTypes.func.isRequired,
};
