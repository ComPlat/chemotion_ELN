import React from 'react';
import { PanelGroup, Panel } from 'react-bootstrap';
import ContainerComponent from './ContainerComponent';
import ContainerRow from './SampleDetailsContainersDnd';
import { HeaderDeleted, HeaderNormal,
  AnalysisModeBtn } from './SampleDetailsContainersAux';

const RndNotAvailable = () => (
  <div>
    <p className="noAnalyses-warning">
      Not available.
    </p>
  </div>
);

const RndNoAnalyses = ({ addButton }) => (
  <div>
    <p>{addButton()}</p>
    <p className="noAnalyses-warning">
      There are currently no Analyses.
    </p>
  </div>
);

const RndOrder = ({ sample, mode, readOnly, isDisabled, handleRemove,
  handleMove, handleUndo, handleAccordionOpen, toggleAddToReport, toggleMode,
  orderContainers, addButton }) => {
  return (
    <div>
      <p>{AnalysisModeBtn(mode, toggleMode, isDisabled)}{addButton()}</p>
      {
        orderContainers.map((container, i) => {
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
              handleAccordionOpen={handleAccordionOpen}
              handleUndo={handleUndo}
              toggleAddToReport={toggleAddToReport}
            />
          );
        })
      }
    </div>
  );
};

const RndEdit = ({ sample, mode, handleRemove, handleAccordionOpen,
  toggleAddToReport, toggleMode, activeAnalysis, orderContainers, readOnly,
  isDisabled, addButton, handleChange, handleUndo }) => {

  const headerDeletedFunc = container => (
    <HeaderDeleted
      container={container}
      handleUndo={handleUndo}
      mode={mode}
    />
  );

  const headerNormalFunc = (container, serial) => (
    <HeaderNormal
      sample={sample}
      container={container}
      mode={mode}
      serial={serial}
      handleUndo={handleUndo}
      readOnly={readOnly}
      isDisabled={isDisabled}
      handleRemove={handleRemove}
      handleAccordionOpen={handleAccordionOpen}
      toggleAddToReport={toggleAddToReport}
    />
  );

  return (
    <div>
      <p>{AnalysisModeBtn(mode, toggleMode, isDisabled)}{addButton()}</p>
      <PanelGroup defaultActiveKey={0} activeKey={activeAnalysis} accordion>
        {orderContainers.map((container, i) => {
          const id = container.id || `fake_${i}`;
          if (container.is_deleted) {
            return (
              <Panel
                header={headerDeletedFunc(container)}
                eventKey={id}
                key={`${id}CRowEdit`}
              />
            );
          }

          return (
            <Panel
              header={headerNormalFunc(container, id)}
              eventKey={id}
              key={`${id}CRowEdit`}
            >
              <ContainerComponent
                readOnly={readOnly}
                container={container}
                disabled={isDisabled}
                onChange={handleChange}
              />
            </Panel>
          );
        })}
      </PanelGroup>
    </div>
  );
};

module.exports = { RndNotAvailable, RndNoAnalyses, RndOrder, RndEdit };
