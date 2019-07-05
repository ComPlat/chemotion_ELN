import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Checkbox, OverlayTrigger, Tooltip,
  MenuItem, SplitButton, ButtonGroup
} from 'react-bootstrap';
import { startsWith, filter, map, flatMap } from 'lodash';
import QuillViewer from './QuillViewer';
import PrintCodeButton from './common/PrintCodeButton';
import { stopBubble } from './utils/DomHelper';
import ImageModal from './common/ImageModal';
import SpectraActions from './actions/SpectraActions';
import LoadingActions from './actions/LoadingActions';
import { BuildSpcInfo, JcampIds } from './utils/SpectraHelper';
import { hNmrCheckMsg, cNmrCheckMsg, msCheckMsg } from './utils/ElementUtils';
import { contentToText } from './utils/quillFormat';
import UIStore from './stores/UIStore';
import { chmoConversions } from './OlsComponent';

const qCheckPass = () => (
  <div style={{ display: 'inline', color: 'green' }}>
    &nbsp;
    <i className="fa fa-check" />
  </div>
);

const qCheckFail = (msg, kind, atomNum = '') => (
  <div style={{ display: 'inline', color: 'red' }}>
    &nbsp;
    (<sup>{atomNum}</sup>{kind} {msg})
  </div>
);

const qCheckMsg = (sample, container) => {
  const availKinds = ['1H NMR', '13C NMR', 'Mass'];
  if (sample.molecule
      && container.extended_metadata
      && availKinds.indexOf(container.extended_metadata.kind) < 0) {
    return '';
  }
  const { kind, content } = container.extended_metadata;
  const str = contentToText(content);

  if (kind === '1H NMR') {
    const msg = hNmrCheckMsg(sample.molecule.sum_formular, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'H', '1');
  } else if (kind === '13C NMR') {
    const msg = cNmrCheckMsg(sample.molecule.sum_formular, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'C', '13');
  } else if (kind === 'Mass') {
    const msg = msCheckMsg(sample.molecule.exact_molecular_weight, str);
    return msg === '' ? qCheckPass() : qCheckFail(msg, 'MS', '');
  }
  return '';
};

const SpectraViewerBtn = ({
  sample, spcInfo, hasJcamp, hasChemSpectra,
  toggleSpectraModal, confirmRegenerate,
}) => (
  <OverlayTrigger
    placement="bottom"
    delayShow={500}
    overlay={<Tooltip id="spectra">Spectra Viewer {!spcInfo ? ': Reprocess' : ''}</Tooltip>}
  >{spcInfo ? (
    <ButtonGroup className="button-right">
      <SplitButton
        id="spectra-viewer-split-button"
        pullRight
        bsStyle="info"
        bsSize="xsmall"
        title={<i className="fa fa-area-chart" />}
        onToggle={(open, event) => { if (event) { event.stopPropagation(); } }}
        onClick={toggleSpectraModal}
        disabled={!spcInfo || !hasChemSpectra}
      >
        <MenuItem
          id="regenerate-spectra"
          key="regenerate-spectra"
          onSelect={(eventKey, event) => {
            event.stopPropagation();
            confirmRegenerate(event);
          }}
          disabled={!hasJcamp || !sample.can_update}
        >
          <i className="fa fa-refresh" /> Reprocess
        </MenuItem>
      </SplitButton>
    </ButtonGroup>
  ) : (
    <Button
      bsStyle="warning"
      bsSize="xsmall"
      className="button-right"
      onClick={confirmRegenerate}
      disabled={!hasJcamp || !sample.can_update || !hasChemSpectra}
    >
      <i className="fa fa-area-chart" /><i className="fa fa-refresh " />
    </Button>
  )}
  </OverlayTrigger>
);

SpectraViewerBtn.propTypes = {
  sample: PropTypes.object,
  hasJcamp: PropTypes.bool,
  spcInfo: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.bool,
  ]),
  hasChemSpectra: PropTypes.bool,
  toggleSpectraModal: PropTypes.func.isRequired,
  confirmRegenerate: PropTypes.func.isRequired,
};

SpectraViewerBtn.defaultProps = {
  hasJcamp: false,
  spcInfo: false,
  sample: {},
  hasChemSpectra: false,
};

const editModeBtn = (toggleMode, isDisabled) => (
  <Button
    bsSize="xsmall"
    bsStyle="primary"
    onClick={toggleMode}
    disabled={isDisabled}
  >
    <span>
      <i className="fa fa-edit" />&nbsp;
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
      <i className="fa fa-reorder" />&nbsp;
      Order mode
    </span>
  </Button>
);

const AnalysisModeBtn = (mode, toggleMode, isDisabled) => {
  switch (mode) {
    case 'order':
      return orderModeBtn(toggleMode, isDisabled);
    default:
      return editModeBtn(toggleMode, isDisabled);
  }
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

const HeaderDeleted = ({ container, handleUndo, mode }) => {
  const mKind = container.extended_metadata.kind;
  const mStatus = container.extended_metadata.status;
  const kind = (mKind && mKind !== '') ? ` - Type: ${(mKind.split('|')[1] || mKind).trim()}` : '';
  const status = (mStatus && mStatus !== '') ? ` - Status: ${mStatus}` : '';

  return (
    <div className="analysis-header-delete">
      <strike>
        { container.name }
        { kind }
        { status }
      </strike>
      <div className="button-right undo-middle">
        {undoBtn(container, mode, handleUndo)}
      </div>
    </div>
  );
};

const previewImage = (container) => {
  const rawImg = container.preview_img;
  const noAttSvg = '/images/wild_card/no_attachment.svg';
  const noAvaSvg = '/images/wild_card/not_available.svg';
  switch (rawImg) {
    case null:
    case undefined:
      return noAttSvg;
    case 'not available':
      return noAvaSvg;
    default:
      return `data:image/png;base64,${rawImg}`;
  }
};

const headerBtnGroup = (
  container, sample, mode, handleRemove, handleSubmit,
  toggleAddToReport, isDisabled, readOnly,
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

  const spcInfo = BuildSpcInfo(sample, container);
  const toggleSpectraModal = (e) => {
    e.stopPropagation();
    SpectraActions.ToggleModal();
    SpectraActions.LoadSpectra.defer(spcInfo);
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
  const { hasChemSpectra } = UIStore.getState();

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
      <SpectraViewerBtn
        sample={sample}
        hasJcamp={hasJcamp}
        spcInfo={spcInfo}
        hasChemSpectra={hasChemSpectra}
        toggleSpectraModal={toggleSpectraModal}
        confirmRegenerate={confirmRegenerate}
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

const HeaderNormal = ({
  sample, container, mode, readOnly, isDisabled, serial,
  handleRemove, handleSubmit, handleAccordionOpen, toggleAddToReport,
}) => {
  const clickToOpen = () => handleAccordionOpen(serial);

  let kind = container.extended_metadata.kind || '';
  kind = (kind.split('|')[1] || kind).trim();
  const status = container.extended_metadata.status || '';
  const previewImg = previewImage(container);
  const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
  const contentOneLine = {
    ops: content.ops.map((x) => {
      const c = Object.assign({}, x);
      if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
      return c;
    }),
  };
  let hasPop = true;
  let fetchNeeded = false;
  let fetchId = 0;
  if (container.preview_img && container.preview_img !== undefined && container.preview_img !== 'not available') {
    const containerAttachments = filter(container.children, o => o.attachments.length > 0);
    const atts = flatMap(map(containerAttachments, 'attachments'));
    const imageThumb = filter(atts, o => o.thumb === true && startsWith(o.content_type, 'image/'));
    if (imageThumb && imageThumb.length > 0) {
      fetchNeeded = true;
      fetchId = imageThumb[0].id;
    }
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
          preivewObject={{
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
            container, sample, mode, handleRemove, handleSubmit,
            toggleAddToReport, isDisabled, readOnly,
          )
        }
        <div className="lower-text">
          <div className="main-title">{container.name}</div>
          <div className="sub-title">Type: {kind}</div>
          <div className="sub-title">
            Status: {status} {qCheckMsg(sample, container)}
          </div>
          <div className="desc sub-title">
            <span style={{ float: 'left', marginRight: '5px' }}>
              Content:
            </span>
            <QuillViewer value={contentOneLine} preview />
          </div>
        </div>
      </div>
    </div>
  );
};

module.exports = { HeaderDeleted, HeaderNormal, AnalysisModeBtn };
