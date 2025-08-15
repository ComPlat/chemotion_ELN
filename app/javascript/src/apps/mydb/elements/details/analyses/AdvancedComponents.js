import {
  ListGroup, Button, ButtonGroup, Form
} from 'react-bootstrap';
import React, { useState, useMemo, useCallback } from 'react';

import { DatasetDropZone } from 'src/apps/mydb/elements/details/analyses/GeneralComponents';
import { FileContainer, ZipFileContainer } from 'src/apps/mydb/elements/details/analyses/FileManager';
import ElementContainer from 'src/models/Container';
import { addNewAnalyses, createDataset, createAttachements } from 'src/apps/mydb/elements/details/analyses/utils';

class ContainerWrapper {
  static newWarpper(name) {
    return new ContainerWrapper({
      id: null,
      name: name ?? 'New',
      description: '',
      children: []
    });
  }

  constructor({
    id, name, description, children, files
  }) {
    this.id = id ?? ElementContainer.buildID();
    this.name = name;
    this.description = description;
    this.files = files ?? [];
    this.children = children.filter((x) => x.container_type === 'dataset' || x instanceof ContainerWrapper).map((x) => (x instanceof ContainerWrapper ? x : new ContainerWrapper(x)));
  }

  addChild() {
    this.children.push(ContainerWrapper.newWarpper());
  }
}

function AnalysisListItem({
  backgroundColor, container, setContainer, addContainer, removeContainer
}) {
  return (
    <ListGroup.Item
      style={{
        backgroundColor
      }}
      key={`item_${container.id}`}
      className="d-flex justify-content-between align-items-start"
    >

      <div
        key={`DIVV__${container.id}`}
        className="flex-grow-1 me-3"
        style={{ overflow: 'hidden' }}
      >
        <Form.Group controlId="formName">
          <Form.Label>Analysis: </Form.Label>
          <Button
            size="xsm"
            type="button"
            onClick={() => removeContainer(container.id)}
            title="Remove"
            variant="danger"
          >
            <i className="fa fa-close" />
          </Button>
          <Form.Control
            className="mt-1"
            type="text"
            placeholder="Name of the analysis"
            value={container.name}
            onChange={(e) => setContainer((x) => ({ ...x, name: e.target.value }))}
          />
        </Form.Group>
        <div className="label--bold">
          Datasets:
        </div>
        {container.children.map((ds) => (
          <DatasestListItem
            key={ds.id}
            dataset={ds}
            droppedPaths={ds.files}
            removeDataset={(datasetId) => setContainer((x) => {
              const children = x.children.filter((child) => child.id !== datasetId).map((child, idx) => new ContainerWrapper({ ...child, name: `Dataset #${idx + 1}` }));
              return { ...x, children };
            })}
            setDroppedPaths={(files) => setContainer((x) => {
              const children = x.children.map((child, idx) => {
                if (ds.id !== child.id) {
                  return child;
                }

                return new ContainerWrapper({ ...child, files });
              });
              return { ...x, children };
            })}
          />
        ))}
      </div>
      <Button
        className="position-absolute top-0 end-0 m-2"
        size="xsm"
        variant="success"
        onClick={addContainer}
      >
        <i className="fa fa-plus" />
      </Button>
    </ListGroup.Item>
  );
}

function DatasestListItem({
  dataset, droppedPaths, setDroppedPaths, removeDataset
}) {
  return (
    <div className="ml-5 text-truncate flex-grow-1 me-3 list-group-item">
      <div>
        {dataset.name}
        <Button
          size="xsm"
          type="button"
          onClick={() => removeDataset(dataset.id)}
          title="Remove"
          variant="danger"
          className="mb-1"
        >
          <i className="fa fa-close" />
        </Button>
        <DatasetDropZone droppedPaths={droppedPaths} setDroppedPaths={setDroppedPaths} />
      </div>
    </div>
  );
}

function AdvancedAnalysesList({
  handleClose, setConsumedPaths, listedFiles, setElement
}) {
  const [analContainerList, setAnalContainer] = useState([]);
  const wrapperSetAnaContiainer = (val) => {
    const changedVal = typeof val === 'function' ? val(analContainerList) : val;
    setAnalContainer(changedVal);
    setConsumedPaths(changedVal.map((ana) => ana.children.map((ds) => ds.files)).flat(Infinity));
  };
  const addAnalyses = useCallback(() => {
    wrapperSetAnaContiainer((x) => [...x, ContainerWrapper.newWarpper()]);
  });

  const emptyAnalyses = useCallback(() => {
    wrapperSetAnaContiainer((x) => []);
  });

  const removeContainer = useCallback((toRemoveId) => {
    wrapperSetAnaContiainer((x) => x.filter((container) => container.id !== toRemoveId));
  });

  const execute = useCallback(() => {
    setElement((element) => {
      const preprocesdAnaContainer = analContainerList.map((ana) => {
        const datasets = ana.children.filter((ds) => ds.files.length > 0);
        if (datasets.length == 0) {
          return;
        }
        const anaContainer = addNewAnalyses(element);
        anaContainer.name = ana.name;
        anaContainer.id = ana.id;
        const newDsObj = datasets.map((ds) => {
          const fileObjs = ds.files.map((fp) => ({ fp, fa: FileContainer.pathAsArray(fp) })).map(({ fp, fa }) => {
            const findParentAndChild = (fl, fa, idx) => {
              while (true) {
                const new_fl = fl.filter((fileObj) => fileObj.fullPathArray[idx] === fa[idx]);
                if (new_fl.length) {
                  fl = new_fl;
                  idx += 1;
                } else {
                  break;
                }

                if (idx === fa.length) {
                  break;
                }
              }
              const child = fl[0];
              if (idx >= fa.length) {
                return { child };
              }

              const result = findParentAndChild(child.subFiles, fa, idx);
              if (idx === fa.length - 1) {
                result.parent = child;
              }
              return result;
            };
            const { parent, child } = findParentAndChild(listedFiles, fa, 0);
            if (parent) {
              parent.subFiles = parent.subFiles.filter((fileObj) => fileObj != child);
            }

            child.moveUpToRoot();
            return child;
          });

          const datasetContainer = createDataset();
          datasetContainer.name = ds.name;
          anaContainer.children.push(datasetContainer);
          return { datasetContainer, fileObjs };
        });

        return { anaContainer, newDsObj };
      });

      preprocesdAnaContainer.forEach(async ({ anaContainer, newDsObj }) => {
        newDsObj.forEach(async ({ datasetContainer, fileObjs }) => {
          let file = null;

          if (fileObjs.length > 1) {
            file = await new ZipFileContainer(fileObjs).getFile();
          } else {
            file = await fileObjs[0].getFile();
          }
          const newAttachments = createAttachements([file]);
          datasetContainer.attachments.push(...newAttachments);
        });
      });

      return element;
    });
    handleClose();
  });

  return (
    <>
      <ButtonGroup>
        <Button variant="success" onClick={addAnalyses}>
          <i className="fa fa-plus me-1" />
          Add Analyse
        </Button>
        <Button
          disabled={!analContainerList.length || !analContainerList.reduce((y, x) => y && x.children.length, true)}
          variant="primary"
          onClick={execute}
        >
          Execute
        </Button>
        <Button disabled={!analContainerList.length} variant="danger" onClick={emptyAnalyses}>
          <i className="fa fa-close me-1" />
          Empty
        </Button>
      </ButtonGroup>
      <ListGroup
        style={{
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {analContainerList.map((anaContainer, index) => {
          const setContainer = (changedX) => {
            wrapperSetAnaContiainer((x) => {
              let changedXVal = typeof changedX === 'function' ? changedX({ ...x[index] }) : changedX;
              changedXVal = changedXVal instanceof ContainerWrapper ? changedXVal : new ContainerWrapper(changedXVal);
              return x.map((item, i) => (i === index ? changedXVal : item));
            });
          };

          const addDataset = () => {
            setContainer((x) => {
              const children = [...x.children, ContainerWrapper.newWarpper(`Dataset #${x.children.length + 1}`)];
              return { ...x, children };
            });
          };

          return (
            <AnalysisListItem
              backgroundColor={index % 2 === 0 ? '#d8d9da' : '#c8c9ca'}
              key={anaContainer.id}
              container={anaContainer}
              removeContainer={removeContainer}
              addContainer={addDataset}
              setContainer={setContainer}
            />
          );
        })}
      </ListGroup>
    </>
  );
}

export {
  AdvancedAnalysesList
};
