/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import {
  ButtonToolbar, Accordion, Card, Button, OverlayTrigger, Tooltip,
} from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
import ContainerCompareAnalyses from 'src/components/container/ContainerCompareAnalyses';
import ContainerRow from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersDnd';
import {
  AnalysesHeader,
  AnalysisModeToggle,
} from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersAux';
import AccordionHeaderWithButtons from 'src/components/common/AccordionHeaderWithButtons';
import { CommentButton, CommentBox } from 'src/components/common/AnalysisCommentBoxComponent';

function RndNotAvailable() {
  return (
    <p className="m-0">Not available.</p>
  );
}

function RndNoAnalyses({ addButton }) {
  return (
    <div className='d-flex justify-content-between align-items-center'>
      <p className='m-0'>There are currently no Analyses.</p>
      <ButtonToolbar className="gap-2">
        {addButton()}
      </ButtonToolbar>
    </div>
  );
}

function ReactionsDisplay({
  sample,
  mode,
  readOnly,
  isDisabled,
  handleRemove,
  handleSubmit,
  handleMove,
  handleUndo,
  toggleAddToReport,
  handleToggleMode,
  orderContainers,
  addButton,
  handleAccordionOpen,
  activeAnalysis,
  handleChange,
  handleCommentTextChange,
  rootContainer,
  handleAdd,
}) {
  const [commentBoxVisible, setCommentBoxVisible] = useState(false);

  const toggleCommentBox = () => setCommentBoxVisible((prev) => !prev);

  const analyses = [];
  const comparisons = [];

  orderContainers.forEach((container, index) => {
    if (container.extended_metadata && container.extended_metadata.is_comparison) {
      comparisons.push(container);
    } else {
      analyses.push(container);
    }
  });

  const renderContainerCard = (container, i, isFirstTab) => {
    const id = container.id || `fake_${i}`;
    return (
      <Card
        key={`${id}CRowEdit`}
        className={"rounded-0 border-0" + (isFirstTab ? '' : ' border-top')}
      >
        <Card.Header className="rounded-0 p-0 border-bottom-0">
          <AccordionHeaderWithButtons eventKey={id}>
            <AnalysesHeader
              sample={sample}
              container={container}
              mode={mode}
              handleUndo={handleUndo}
              readOnly={readOnly}
              isDisabled={isDisabled}
              handleRemove={handleRemove}
              handleSubmit={handleSubmit}
              toggleAddToReport={toggleAddToReport}
            />
          </AccordionHeaderWithButtons>
        </Card.Header>
        {!container.is_deleted && (
          <Accordion.Collapse eventKey={id}>
            <Card.Body>
              {container.extended_metadata && container.extended_metadata.is_comparison ? (
                <ContainerCompareAnalyses
                  templateType="sample"
                  readOnly={readOnly}
                  sample={sample}
                  container={container}
                  rootContainer={rootContainer}
                  index={i}
                  handleSubmit={handleSubmit}
                  disabled={isDisabled}
                  onChange={handleChange}
                />
              ) : (
                <ContainerComponent
                  templateType="sample"
                  readOnly={readOnly}
                  container={container}
                  rootContainer={rootContainer}
                  index={i}
                  disabled={isDisabled}
                  onChange={handleChange}
                />
              )}
            </Card.Body>
          </Accordion.Collapse>
        )}
      </Card>
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        {AnalysisModeToggle(mode, handleToggleMode, isDisabled)}
        <ButtonToolbar className="gap-2">
          <CommentButton toggleCommentBox={toggleCommentBox} size="xsm" />
          {addButton()}
        </ButtonToolbar>
      </div>
      <CommentBox
        isVisible={commentBoxVisible}
        value={sample.container.description}
        handleCommentTextChange={handleCommentTextChange}
      />
      {mode === 'edit' ? (
        <>
          {analyses.length > 0 && (
            <Accordion
              id="editable-analysis-list"
              onSelect={handleAccordionOpen}
              activeKey={activeAnalysis}
              className='border rounded overflow-hidden'
            >
              {analyses.map((container, i) => renderContainerCard(container, i, i === 0))}
            </Accordion>
          )}

          <div className="d-flex justify-content-between align-items-center mb-3 mt-4 border-top pt-3">
            <div className="d-flex align-items-center gap-2">
              <h6 className="m-0 fw-bold">Spectra comparison</h6>
              <OverlayTrigger
                placement="right"
                overlay={<Tooltip id="comparison-info-tooltip">Example text for now</Tooltip>}
              >
                <i className="fa fa-info-circle text-info" style={{ cursor: 'pointer' }} />
              </OverlayTrigger>
            </div>
            <Button
              size="xsm"
              variant="success"
              onClick={() => handleAdd(true)}
              disabled={isDisabled}
            >
              <i className="fa fa-plus me-1" />
              Add comparisons
            </Button>
          </div>

          {comparisons.length > 0 && (
            <Accordion
              id="editable-comparison-list"
              onSelect={handleAccordionOpen}
              activeKey={activeAnalysis}
              className='border rounded overflow-hidden'
            >
              {comparisons.map((container, i) => renderContainerCard(container, i, i === 0))}
            </Accordion>
          )}
        </>
      ) : (
        <div>
          {orderContainers.map((container, i) => {
            const id = container.id || `fake_${i}`;
            return (
              <ContainerRow
                sample={sample}
                mode={mode}
                container={container}
                readOnly={readOnly}
                isDisabled={isDisabled}
                key={`${id}CRowOrder`}
                addButton={addButton}
                handleMove={handleMove}
                handleRemove={handleRemove}
                handleSubmit={handleSubmit}
                handleUndo={handleUndo}
                toggleAddToReport={toggleAddToReport}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export {
  RndNotAvailable, RndNoAnalyses, ReactionsDisplay
};
