/* eslint-disable react/forbid-prop-types */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
import React from 'react';
import PropTypes from 'prop-types';
import { Panel, Button } from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
import QuillViewer from 'src/components/QuillViewer';
import ImageModal from 'src/components/common/ImageModal';
import { instrumentText } from 'src/utilities/ElementUtils';
import { previewContainerImage } from 'src/utilities/imageHelper';
import { JcampIds, BuildSpcInfos } from 'src/utilities/SpectraHelper';
import UIStore from 'src/stores/alt/stores/UIStore';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import ViewSpectra from 'src/apps/mydb/elements/details/ViewSpectra';
import EditorAnalysisBtn from './EditorAnalysisBtn';

const headerBtnGroup = (props) => {
  const {
    container, readOnly, generic, fnRemove, fnChange
  } = props;
  const jcampIds = JcampIds(container);
  const hasJcamp = jcampIds.orig.length > 0;
  const confirmRegenerate = (e) => {
    e.stopPropagation();
    if (confirm('Regenerate spectra?')) {
      LoadingActions.start();
      SpectraActions.Regenerate(jcampIds, fnChange);
    }
  };
  const spcInfo = BuildSpcInfos(generic, container);
  const { hasChemSpectra } = UIStore.getState();
  const toggleSpectraModal = (e) => {
    SpectraActions.ToggleModal();
    SpectraActions.LoadSpectra.defer(spcInfo);
  };
  return (
    <div className="upper-btn">
      <Button
        bsSize="xsmall"
        bsStyle="danger"
        className="button-right"
        disabled={readOnly}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); fnRemove(container); }}
      >
        <i className="fa fa-trash" />
      </Button>
      <EditorAnalysisBtn
        element={generic}
        hasJcamp={hasJcamp}
        spcInfo={spcInfo}
        hasChemSpectra={hasChemSpectra}
        toggleSpectraModal={toggleSpectraModal}
        confirmRegenerate={confirmRegenerate}
      />
    </div>
  );
};

const newHeader = (props) => {
  const { container } = props;
  let kind = container.extended_metadata.kind || '';
  kind = (kind.split('|')[1] || kind).trim();
  const insText = instrumentText(container);
  const previewImg = previewContainerImage(container);
  const status = container.extended_metadata.status || '';
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
  if (previewImg.startsWith('data:image')) {
    fetchNeeded = true;
    fetchId = container.preview_img.id;
  } else {
    hasPop = false;
  }

  return (
    <div className="analysis-header order" style={{ width: '100%' }}>
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
          headerBtnGroup(props)
        }
        <div className="lower-text">
          <div className="main-title">{container.name}</div>
          <div className="sub-title">Type: {kind}</div>
          <div className="sub-title">Status: {status} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {insText}</div>

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

const header = container => (
  <>
    {container.name}
    {(container.extended_metadata && container.extended_metadata.kind && container.extended_metadata.kind !== '') ?
      (` - Type: ${container.extended_metadata.kind.split('|')[1] || container.extended_metadata.kind}`) : ''}
    {(container.extended_metadata && container.extended_metadata.status && container.extended_metadata.status !== '') ? (` - Status: ${container.extended_metadata.status}`) : ''}
  </>
);

const AiHeaderDeleted = (props) => {
  const {
    container, idx, fnUndo, noAct
  } = props;
  const id = container.id || `fake_${idx}`;

  return (
    <Panel eventKey={id} key={`gen_${id}_ai`}>
      <Panel.Heading>
        <Panel.Title toggle>
          <strike>{header(container)}</strike>
          {
            noAct ? null : (
              <Button className="pull-right" bsSize="xsmall" bsStyle="danger" onClick={(e) => { e.preventDefault(); e.stopPropagation(); fnUndo(container); }}>
                <i className="fa fa-undo" aria-hidden="true" />
              </Button>
            )
          }
        </Panel.Title>
      </Panel.Heading>
    </Panel>
  );
};

AiHeaderDeleted.propTypes = {
  container: PropTypes.object.isRequired,
  idx: PropTypes.any.isRequired,
  fnUndo: PropTypes.func,
  noAct: PropTypes.bool,
};
AiHeaderDeleted.defaultProps = { fnUndo: () => {}, noAct: false };

const AiHeader = (props) => {
  const {
    container, idx, generic, readOnly, fnChange, fnRemove, noAct, handleSubmit
  } = props;
  const id = idx; // container.id || `fake_${idx}`;

  return (
    <Panel eventKey={id} key={`gen_${id}_ai`}>
      <Panel.Heading>
        <Panel.Title toggle>
          {newHeader(props)}
        </Panel.Title>
      </Panel.Heading>
      <Panel.Body collapsible>
        <ContainerComponent
          templateType={generic.type}
          readOnly={readOnly}
          container={container}
          onChange={() => fnChange()}
        />
        <ViewSpectra
          sample={generic}
          handleSampleChanged={fnChange}
          handleSubmit={handleSubmit}
        />
      </Panel.Body>
    </Panel>
  );
};

AiHeader.propTypes = {
  container: PropTypes.object.isRequired,
  idx: PropTypes.any.isRequired,
  readOnly: PropTypes.bool.isRequired,
  generic: PropTypes.object.isRequired,
  fnChange: PropTypes.func.isRequired,
  fnRemove: PropTypes.func,
  noAct: PropTypes.bool,
  handleSubmit: PropTypes.func.isRequired
};
AiHeader.defaultProps = { fnRemove: () => {}, noAct: false };

export { AiHeader, AiHeaderDeleted };
