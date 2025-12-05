/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { ButtonToolbar, Accordion, Card } from 'react-bootstrap';
import ContainerComponent from 'src/components/container/ContainerComponent';
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
  rootContainer
}) {
  const [commentBoxVisible, setCommentBoxVisible] = useState(false);

  const toggleCommentBox = () => setCommentBoxVisible((prev) => !prev);

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
        <Accordion
          id="editable-analysis-list"
          onSelect={handleAccordionOpen}
          activeKey={activeAnalysis}
          className='border rounded overflow-hidden'
        >
          {orderContainers.map((container, i) => {
            const id = container.id || `fake_${i}`;
            const isActiveTab = activeAnalysis === id;
            const isFirstTab = i === 0;
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
                      <ContainerComponent
                        templateType="sample"
                        element={sample}
                        readOnly={readOnly}
                        container={container}
                        rootContainer={rootContainer}
                        index={i}
                        disabled={isDisabled}
                        onChange={handleChange}
                      />
                    </Card.Body>
                  </Accordion.Collapse>
                )}
              </Card>
            );
          })}
        </Accordion>
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
