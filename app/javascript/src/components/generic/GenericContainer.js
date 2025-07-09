/* eslint-disable react/forbid-prop-types */
/* eslint-disable no-alert */
/* eslint-disable no-restricted-globals */
import React from 'react';
import PropTypes from 'prop-types';
import { Accordion, Button, Card } from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
import QuillViewer from 'src/components/QuillViewer';
import ImageModal from 'src/components/common/ImageModal';
import { instrumentText } from 'src/utilities/ElementUtils';
import { getAttachmentFromContainer } from 'src/utilities/imageHelper';
import {
  JcampIds, BuildSpcInfos, BuildSpcInfosForNMRDisplayer, isNMRKind
} from 'src/utilities/SpectraHelper';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import SpectraActions from 'src/stores/alt/actions/SpectraActions';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import SpectraEditorButton from 'src/components/common/SpectraEditorButton';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';

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
  const spcInfos = BuildSpcInfos(generic, container);
  const { hasChemSpectra, hasNmriumWrapper } = UIStore.getState();
  const toggleSpectraModal = (e) => {
    SpectraActions.ToggleModal();
    SpectraActions.LoadSpectra.defer(spcInfos);
  };
  const toggleNMRDisplayerModal = (e) => {
    const spcInfosForNMRDisplayer = BuildSpcInfosForNMRDisplayer(
      generic,
      container
    );
    e.stopPropagation();
    SpectraActions.ToggleModalNMRDisplayer();
    SpectraActions.LoadSpectraForNMRDisplayer.defer(spcInfosForNMRDisplayer); // going to fetch files base on spcInfos
  };
  const { chmos } = UserStore.getState();
  const hasNMRium = isNMRKind(container, chmos) && hasNmriumWrapper;

  return (
    <div className="d-flex justify-content-between align-items-center mb-0 gap-1">
      <SpectraEditorButton
        element={generic}
        hasJcamp={hasJcamp}
        spcInfos={spcInfos}
        hasChemSpectra={hasChemSpectra}
        toggleSpectraModal={toggleSpectraModal}
        confirmRegenerate={confirmRegenerate}
        toggleNMRDisplayerModal={toggleNMRDisplayerModal}
        hasNMRium={hasNMRium}
        hasEditedJcamp={false}
        confirmRegenerateEdited={() => {}}
      />
      <Button
        size="xxsm"
        variant="danger"
        disabled={readOnly}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          fnRemove(container);
        }}
      >
        <i className="fa fa-trash" />
      </Button>
    </div>
  );
};

const newHeader = (props) => {
  const { container, noAct } = props;
  let kind = container.extended_metadata.kind || '';
  kind = (kind.split('|')[1] || kind).trim();
  const insText = instrumentText(container);
  const status = container.extended_metadata.status || '';
  const content = container.extended_metadata.content || {
    ops: [{ insert: '' }],
  };
  const contentOneLine = {
    ops: content.ops.map((x) => {
      const c = Object.assign({}, x);
      if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
      return c;
    }),
  };
  const attachment = getAttachmentFromContainer(container);

  return (
    <div className="analysis-header w-100 d-flex gap-3 lh-base">
      <div className="preview border d-flex align-items-center">
        <ImageModal
          attachment={attachment}
          popObject={{
            title: container.name,
          }}
        />
      </div>
      <div className="flex-grow-1">
        <div className="d-flex justify-content-between align-items-center">
          <h4 className="flex-grow-1">{container.name}</h4>
          {!noAct && headerBtnGroup(props)}
        </div>
        <div>
          {`Type: ${kind}`}
          <br />
          {`Status: ${status}`}
          <span className="me-5" />
          {insText}
        </div>
        <div className="d-flex gap-2">
          <span>Content:</span>
          <div className="flex-grow-1">
            <QuillViewer value={contentOneLine} className="p-0" preview />
          </div>
        </div>
      </div>
    </div>
  );
};

const header = (container) => (
  <>
    {container.name}
    {(container.extended_metadata?.kind || '') !== ''
      ? ` - Type: ${
          container.extended_metadata.kind.split('|')[1] ||
          container.extended_metadata.kind
        }`
      : ''}
    {(container.extended_metadata?.status || '') !== ''
      ? ` - Status: ${container.extended_metadata.status}`
      : ''}
  </>
);

function HeaderDeleted(props) {
  const { container, fnUndo, noAct } = props;
  return (
    <div className="d-flex w-100 mb-0 align-items-center">
      <strike className="flex-grow-1">{header(container)}</strike>
      {!noAct && (
        <Button
          className="ms-auto"
          size="xsm"
          variant="danger"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            fnUndo(container);
          }}
        >
          <i className="fa fa-undo" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

HeaderDeleted.propTypes = {
  container: PropTypes.object.isRequired,
  fnUndo: PropTypes.func,
  noAct: PropTypes.bool,
};

HeaderDeleted.defaultProps = { fnUndo: () => {}, noAct: false };

function AiHeaderDeleted(props) {
  const {
    container, idx, fnUndo, noAct
  } = props;
  return (
    <Card.Header className="rounded-0 p-0 border-bottom-0">
      <AccordionHeaderWithButtons eventKey={idx}>
        <HeaderDeleted container={container} fnUndo={fnUndo} noAct={noAct} />
      </AccordionHeaderWithButtons>
    </Card.Header>
  );
}

AiHeaderDeleted.propTypes = {
  container: PropTypes.object.isRequired,
  idx: PropTypes.any.isRequired,
  fnUndo: PropTypes.func,
  noAct: PropTypes.bool,
};
AiHeaderDeleted.defaultProps = { fnUndo: () => {}, noAct: false };

function AiHeader(props) {
  const {
    container,
    idx,
    generic,
    readOnly,
    fnChange,
    handleSubmit,
  } = props;

  return (
    <>
      <Card.Header className="rounded-0 p-0 border-bottom-0">
        <AccordionHeaderWithButtons eventKey={idx}>
          {newHeader(props)}
        </AccordionHeaderWithButtons>
      </Card.Header>
      <Accordion.Collapse eventKey={idx}>
        <Card.Body>
          <ContainerComponent
            templateType={generic.type}
            readOnly={readOnly}
            disabled={readOnly}
            container={container}
            onChange={fnChange}
          />
        </Card.Body>
      </Accordion.Collapse>
    </>
  );
}

AiHeader.propTypes = {
  container: PropTypes.object.isRequired,
  idx: PropTypes.any.isRequired,
  readOnly: PropTypes.bool.isRequired,
  generic: PropTypes.object.isRequired,
  fnChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
};

export {
  AiHeader, AiHeaderDeleted
};
