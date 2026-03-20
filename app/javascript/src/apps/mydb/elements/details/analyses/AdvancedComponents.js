import {
  ListGroup, Button, ButtonToolbar, Form
} from 'react-bootstrap';
import React, { useState, useCallback } from 'react';

import { DatasetDropZone } from 'src/apps/mydb/elements/details/analyses/GeneralComponents';
import { FileContainer, ZipFileContainer } from 'src/apps/mydb/elements/details/analyses/FileManager';
import ElementContainer from 'src/models/Container';
import { addNewAnalyses, createDataset, createAttachements } from 'src/apps/mydb/elements/details/analyses/utils';
import PropTypes from 'prop-types';
import OlsTreeSelect from '../../../../../components/OlsComponent';

class ContainerWrapper {
  static newWrapper(name = 'New', kind = '') {
    return new ContainerWrapper({
      id: null,
      name,
      description: '',
      children: [],
      extended_metadata: { kind }
    });
  }

  constructor({
    id, name, description, children, files,
    // eslint-disable-next-line camelcase
    extended_metadata = {}
  }) {
    this.id = id ?? ElementContainer.buildID();
    this.name = name;
    this.description = description;
    this.files = files ?? [];
    // eslint-disable-next-line camelcase
    this.extended_metadata = extended_metadata;
    this.children = children.filter((x) => x.container_type === 'dataset' || x instanceof ContainerWrapper)
      .map((x) => (x instanceof ContainerWrapper ? x : new ContainerWrapper(x)));
  }

  addChild() {
    this.children.push(ContainerWrapper.newWrapper());
  }
}

function AnalysisListItem({
  backgroundColor, container, setContainer, addContainer, removeContainer
}) {
  const handlesSetOntology = (ev) => {
    let kind = (ev || '');
    kind = `${kind.split('|')[0].trim()} | ${(kind.split('|')[1] || '').trim()}`;

    setContainer((x) => {
      let extendedMetadata = x.extended_metadata;
      if (!extendedMetadata) {
        extendedMetadata = {};
      }
      return {
        ...x,
        extended_metadata: {
          ...extendedMetadata,
          kind
        }
      };
    });
  };
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
          <h3>Analysis</h3>
          <Button
            size="xsm"
            type="button"
            onClick={() => removeContainer(container.id)}
            title="Remove Analysis"
            variant="danger"
            className="m-2 position-absolute top-0 end-0"
          >
            <i className="fa fa-trash" />
          </Button>
        </Form.Group>
        <Form.Group controlId="formName">
          <Form.Label>Name</Form.Label>
          <Form.Control
            className="mt-1"
            type="text"
            placeholder="Name of the analysis"
            value={container.name}
            onChange={(e) => setContainer((x) => ({ ...x, name: e.target.value }))}
          />
        </Form.Group>
        <Form.Group controlId="formOLS">
          <Form.Label>Type (Chemical Methods Ontology)</Form.Label>
          <OlsTreeSelect
            selectName="chmo"
            selectedValue={container.extended_metadata?.kind || ''}
            onSelectChange={handlesSetOntology}
            selectedDisable={false}
          />
        </Form.Group>
        <div className="label--bold">
          Datasets
          <Button
            className="m-2"
            size="xsm"
            variant="success"
            onClick={addContainer}
          >
            <i className="fa fa-plus" />
          </Button>

        </div>
        {container.children.map((ds) => (
          <DatasetListItem
            key={ds.id}
            dataset={ds}
            droppedPaths={ds.files}
            removeDataset={(datasetId) => setContainer((x) => {
              const children = x.children.filter((child) => child.id !== datasetId).map((child, idx) => new ContainerWrapper({
                ...child,
                name: `Dataset #${idx + 1}`
              }));
              return { ...x, children };
            })}
            setDroppedPaths={(files) => setContainer((x) => {
              const children = x.children.map((child) => {
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
    </ListGroup.Item>
  );
}

function DatasetListItem({
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
          title="Remove Dataset"
          variant="danger"
          className="mb-1 position-absolute top-0 end-0 "
        >
          <i className="fa fa-trash" />
        </Button>
        <DatasetDropZone droppedPaths={droppedPaths} setDroppedPaths={setDroppedPaths} />
      </div>
    </div>
  );
}

DatasetListItem.propTypes = {
  dataset: PropTypes.func.isRequired,
  setDroppedPaths: PropTypes.func.isRequired,
  droppedPaths: PropTypes.arrayOf(PropTypes.string).isRequired,
  removeDataset: PropTypes.func.isRequired
};

function AdvancedAnalysesList({
  handleClose, setConsumedPaths, listedFiles, setElement
}) {
  const [analContainerList, setAnalContainer] = useState([]);
  const wrapperSetAnaContainer = (val) => {
    const changedVal = typeof val === 'function' ? val(analContainerList) : val;
    setAnalContainer(changedVal);
    setConsumedPaths(changedVal.map((ana) => ana.children.map((ds) => ds.files)).flat(Infinity));
  };
  const addAnalyses = useCallback(() => {
    const newWrapper = ContainerWrapper.newWrapper();
    newWrapper.children.push(ContainerWrapper.newWrapper('Dataset #1'));
    wrapperSetAnaContainer((x) => [...x, newWrapper]);
  }, [analContainerList]);

  const emptyAnalyses = useCallback(() => {
    wrapperSetAnaContainer(() => []);
  }, []);

  const removeContainer = useCallback((toRemoveId) => {
    wrapperSetAnaContainer((x) => x.filter((container) => container.id !== toRemoveId));
  }, []);

  const execute = useCallback(() => {
    setElement((element) => {
      const preprocessAnaContainer = analContainerList.map((ana) => {
        const datasets = ana.children.filter((ds) => ds.files.length > 0);
        if (datasets.length === 0) {
          return null;
        }
        const anaContainer = addNewAnalyses(element);
        anaContainer.name = ana.name;
        anaContainer.extended_metadata.kind = ana.extended_metadata.kind;
        anaContainer.id = ana.id;
        const newDsObj = datasets.map((ds) => {
          const fileObjs = ds.files.map((fp) => ({ fp, fa: FileContainer.pathAsArray(fp) })).map(({ fp, fa }) => {
            const findParentAndChild = (fl, fa, idx) => {
              let fileList = fl;
              let iteratorIdx = idx;
              // eslint-disable-next-line no-constant-condition
              while (true) {
                const loopIdx = iteratorIdx;
                const newFileList = fl.filter((fileObj) => fileObj.fullPathArray[loopIdx] === fa[loopIdx]);
                if (newFileList.length) {
                  fileList = newFileList;
                  iteratorIdx += 1;
                } else {
                  break;
                }

                if (iteratorIdx === fa.length) {
                  break;
                }
              }
              const child = fileList[0];
              if (iteratorIdx >= fa.length) {
                return { child };
              }

              const result = findParentAndChild(child.subFiles, fa, iteratorIdx);
              if (iteratorIdx === fa.length - 1) {
                result.parent = child;
              }
              return result;
            };
            const { parent, child } = findParentAndChild(listedFiles, fa, 0);
            if (parent) {
              parent.subFiles = parent.subFiles.filter((fileObj) => fileObj !== child);
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

      preprocessAnaContainer.forEach(({ newDsObj }) => {
        newDsObj.forEach(async ({ datasetContainer, fileObjs }) => {
          let file = null;

          if (fileObjs.length > 1) {
            file = await new ZipFileContainer(fileObjs).getFile();
          } else {
            file = await fileObjs[0].getFile();
          }
          const newAttachments = createAttachements([file]);
          datasetContainer.attachments.push(...newAttachments);
          return true;
        });
      });

      return element;
    });
    handleClose();
  }, [analContainerList]);

  return (
    <>
      <ButtonToolbar className="gap-2">
        <Button variant="success" onClick={addAnalyses}>
          <i className="fa fa-plus me-1" />
          Analysis
        </Button>
        <Button
          disabled={!analContainerList.length || !analContainerList.reduce((y, x) => y && x.children.length, true)}
          variant="primary"
          onClick={execute}
        >
          Execute
        </Button>
        <Button disabled={!analContainerList.length} variant="danger" onClick={emptyAnalyses}>
          <i className="fa fa-refresh me-1" />
          Reset
        </Button>
      </ButtonToolbar>
      <ListGroup
        style={{
          maxHeight: '70vh',
          overflowY: 'auto',
        }}
      >
        {analContainerList.map((anaContainer, index) => {
          const setContainer = (changedX) => {
            wrapperSetAnaContainer((x) => {
              let changedXVal = typeof changedX === 'function' ? changedX({ ...x[index] }) : changedX;
              changedXVal = changedXVal instanceof ContainerWrapper ? changedXVal : new ContainerWrapper(changedXVal);
              return x.map((item, i) => (i === index ? changedXVal : item));
            });
          };

          const addDataset = () => {
            setContainer((x) => {
              const children = [...x.children, ContainerWrapper.newWrapper(`Dataset #${x.children.length + 1}`)];
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

AdvancedAnalysesList.propTypes = {
  handleClose: PropTypes.func.isRequired,
  setConsumedPaths: PropTypes.func.isRequired,
  listedFiles: PropTypes.arrayOf(FileContainer).isRequired,
  setElement: PropTypes.func.isRequired
};

export {
  // eslint-disable-next-line import/prefer-default-export
  AdvancedAnalysesList
};
