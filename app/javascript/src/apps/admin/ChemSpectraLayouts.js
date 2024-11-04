/* eslint-disable no-param-reassign */
import React, { Component } from 'react';
import ChemSpectraFetcher from 'src/fetchers/ChemSpectraFetcher';
import {
  Table, Button, Form, FormControl, Modal, Panel, FormGroup, ControlLabel, Popover, OverlayTrigger, ButtonGroup, Alert
} from 'react-bootstrap';
import Select from 'react-select';

export default class ChemSpectraLayouts extends Component {
  constructor(props) {
    super(props);
    this.state = {
      layouts: [],
      newDataType: {
        layout: '',
        dataType: '',
      },
      defaultLayouts: [],
      showNewTypeLayoutModal: false,
      alertMessage: null
    };

    this.fetchSpectraLayouts = this.fetchSpectraLayouts.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleAddDataType = this.handleAddDataType.bind(this);
    this.handleDeleteDataType = this.handleDeleteDataType.bind(this);
    this.handleShowNewTypeLayoutModal = this.handleShowNewTypeLayoutModal.bind(this);
    this.handleCloseNewTypeLayoutModal = this.handleCloseNewTypeLayoutModal.bind(this);
    this.getLayoutOptionsAndMapping = this.getLayoutOptionsAndMapping.bind(this);
  }

  componentDidMount() {
    this.fetchSpectraLayouts();
  }

  handleInputChange(event) {
    const { name, value } = event.target;
    this.setState((prevState) => ({
      newDataType: {
        ...prevState.newDataType,
        [name]: value,
      },
    }));
  }

  handleSelectLayout(selectedOption) {
    if (selectedOption) {
      this.setState((prevState) => ({
        newDataType: {
          ...prevState.newDataType,
          layout: selectedOption.value,
        },
      }));
    }
  }

  handleShowNewTypeLayoutModal() {
    this.setState({ showNewTypeLayoutModal: true });
  }

  handleCloseNewTypeLayoutModal() {
    this.setState({
      showNewTypeLayoutModal: false,
      alertMessage: null,
      newDataType: {
        layout: '',
        dataType: '',
      }
    });
  }

  handleAddDataType() {
    const { newDataType, layouts } = this.state;
    if (newDataType.dataType.length === 0) {
      this.setState({ alertMessage: 'Please enter a data type' });
    } else if (newDataType.layout.length === 0) {
      this.setState({ alertMessage: 'Please select a layout' });
    } else {
      const existingLayout = layouts.find(([layout]) => layout === newDataType.layout);

      if (existingLayout) {
        const [, dataTypeArray] = existingLayout;

        if (dataTypeArray.includes(newDataType.dataType.trimEnd())) {
          this.setState({ alertMessage: 'Data type already exists' });
        } else {
          const updatedLayouts = layouts.map(([layout, dataType]) => {
            if (layout === newDataType.layout) {
              return [layout, [...dataType, newDataType.dataType]];
            }
            return [layout, dataType];
          });
          const transformedData = updatedLayouts.reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});

          ChemSpectraFetcher.updateDataTypes(transformedData)
            .then((message) => {
              console.log(message);
              this.handleCloseNewTypeLayoutModal();
              this.fetchUpdatedSpectraLayouts();
            })
            .catch((error) => console.error(error));
        }
      }
    }
  }

  handleDeleteDataType(dataTypeToDelete) {
    const { layouts } = this.state;

    const updatedLayouts = layouts.map((entry) => {
      if (entry[0] === dataTypeToDelete.layout) {
        entry[1] = entry[1].filter((dataType) => dataType !== dataTypeToDelete.dataType);
      }
      return entry;
    });

    const transformedData = updatedLayouts.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {});

    ChemSpectraFetcher.updateDataTypes(transformedData)
      .then((message) => {
        console.log(message);
        this.fetchUpdatedSpectraLayouts();
      })
      .catch((error) => console.error(error));
  }

  fetchSpectraLayouts() {
    ChemSpectraFetcher.fetchSpectraLayouts()
      .then((layouts) => {
        if (layouts) {
          this.setState({ layouts: Object.entries(layouts.current_data_types),
          defaultLayouts: Object.entries(layouts.default_data_types)
          });
        }
      })
      .catch((error) => console.error(error));
  }

  fetchUpdatedSpectraLayouts() {
    ChemSpectraFetcher.fetchUpdatedSpectraLayouts()
      .then((layouts) => {
        if (layouts) {
          this.setState({ layouts });
        }
      })
      .catch((error) => console.error(error));
  }

  getLayoutOptionsAndMapping() {
    const { layouts } = this.state;
    const layoutsMapping = layouts.reduce((acc, [layout, dataTypes]) => {
      dataTypes.forEach((dataType) => {
        acc.push({ layout, dataType });
      });
      return acc;
    }, []);

    const allLayouts = Array.from(new Set(layoutsMapping.map(({ layout }) => layout))).sort();

    const layoutsOptions = allLayouts.map((layout) => ({
      value: layout,
      label: layout
    }));

    return { layoutsOptions, layoutsMapping };
  }

  render() {
    const {
      newDataType, showNewTypeLayoutModal, alertMessage, defaultLayouts
    } = this.state;

    const { layoutsOptions, layoutsMapping } = this.getLayoutOptionsAndMapping();

    return (
      <div>
        <Button onClick={this.handleShowNewTypeLayoutModal}>Add New Data Type</Button>

        <Modal show={showNewTypeLayoutModal} onHide={this.handleCloseNewTypeLayoutModal}>
          <Modal.Header closeButton />
          <Modal.Body>
            {alertMessage && (
            <Alert variant="warning">
              {alertMessage}
            </Alert>
            )}
            <Panel>
              <Panel.Heading>
                <Panel.Title>
                  New Data Type
                </Panel.Title>
              </Panel.Heading>
              <Panel.Body>
                <Form>
                  <FormGroup>
                    <ControlLabel>Data Type</ControlLabel>
                    <FormControl
                      type="text"
                      name="dataType"
                      value={newDataType.dataType}
                      onChange={this.handleInputChange}
                    />
                  </FormGroup>
                  <FormGroup>
                    <ControlLabel>Layout</ControlLabel>
                    <Select
                      name="layout"
                      value={newDataType.layout}
                      onChange={(selectedOption) => this.handleSelectLayout(selectedOption)}
                      options={layoutsOptions}
                      placeholder="Select a Layout"
                    />
                  </FormGroup>
                </Form>
              </Panel.Body>
            </Panel>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={this.handleAddDataType}>
              Add Data Type
            </Button>
            <Button variant="secondary" onClick={this.handleCloseNewTypeLayoutModal}>
              Cancel
            </Button>
          </Modal.Footer>
        </Modal>

        <Panel>
          <Panel.Heading>
            <Panel.Title>
              Data Types
            </Panel.Title>
          </Panel.Heading>
          <Table responsive hover bordered>
            <thead>
              <tr>
                <th>#</th>
                <th>Data Type</th>
                <th>Layout</th>
              </tr>
            </thead>
            <tbody>
              {layoutsMapping.map((entry, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>{entry.dataType}</td>
                  <td>{entry.layout}</td>
                  <td>
                    {' '}
                    {defaultLayouts.some(([layout, dataTypes]) => layout === entry.layout
                  && !dataTypes.includes(entry.dataType)) ? (
                    <ButtonGroup className="actions">
                      <OverlayTrigger
                        root
                        trigger="focus"
                        placement="top"
                        overlay={(
                          <Popover id="popover-positioned-scrolling-left">
                            Delete this data type?
                            <br />
                            <div className="btn-toolbar">
                              <Button
                                bsSize="xsmall"
                                bsStyle="danger"
                                onClick={() => {
                                  this.handleDeleteDataType({ layout: entry.layout, dataType: entry.dataType });
                                }}
                              >
                                {' '}
                                Yes
                              </Button>
                              <span>&nbsp;&nbsp;</span>
                              <Button
                                bsSize="xsmall"
                                bsStyle="warning"
                                onClick={this.handleClick}
                              >
                                {' '}
                                No
                              </Button>
                            </div>
                          </Popover>
                    )}
                      >
                        <Button
                          bsSize="xsmall"
                          bsStyle="danger"
                        >
                          <i className="fa fa-trash-o" />
                        </Button>
                      </OverlayTrigger>
                    </ButtonGroup>
                      ) : (
                        <span />
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      </div>
    );
  }
}
