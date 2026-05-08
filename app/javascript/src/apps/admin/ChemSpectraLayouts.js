/* eslint-disable no-param-reassign */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ChemSpectraFetcher from 'src/fetchers/ChemSpectraFetcher';
import {
  Table, Button, Form, Popover, OverlayTrigger, Alert
} from 'react-bootstrap';
import { FormattedMessage, injectIntl } from 'react-intl';
import AppModal from 'src/components/common/AppModal';
import { Select } from 'src/components/common/Select';

class ChemSpectraLayouts extends Component {
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
    this.handleSelectLayout = this.handleSelectLayout.bind(this);
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
      this.setState({ alertMessage: 'chem_spectra_layouts-please_enter_data_type' });
    } else if (newDataType.layout.length === 0) {
      this.setState({ alertMessage: 'chem_spectra_layouts-please_select_layout' });
    } else {
      const existingLayout = layouts.find(([layout]) => layout === newDataType.layout);

      if (existingLayout) {
        const [, dataTypeArray] = existingLayout;

        if (dataTypeArray.includes(newDataType.dataType.trimEnd())) {
          this.setState({ alertMessage: 'chem_spectra_layouts-data_type_exists' });
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

  fetchSpectraLayouts() {
    ChemSpectraFetcher.fetchSpectraLayouts()
      .then((layouts) => {
        if (layouts) {
          this.setState({
            layouts: Object.entries(layouts.current_data_types),
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

  render() {
    const {
      newDataType, showNewTypeLayoutModal, alertMessage, defaultLayouts
    } = this.state;
    const { intl } = this.props;

    const { layoutsOptions, layoutsMapping } = this.getLayoutOptionsAndMapping();

    return (
      <div>
        <Button
          variant="primary"
          size="md"
          onClick={this.handleShowNewTypeLayoutModal}
          className="mb-2"
        >
          <FormattedMessage id="chem_spectra_layouts-add_new" />
        </Button>

        <AppModal
          show={showNewTypeLayoutModal}
          onHide={this.handleCloseNewTypeLayoutModal}
          title={<FormattedMessage id="chem_spectra_layouts-new_data_type" />}
          primaryActionLabel={intl.formatMessage({ id: 'chem_spectra_layouts-add_data_type' })}
          onPrimaryAction={this.handleAddDataType}
          closeLabel={<FormattedMessage id="cancel" />}
        >
          {alertMessage && (
            <Alert variant="warning">
              <FormattedMessage id={alertMessage} />
            </Alert>
          )}
          <Form>
            <Form.Group className="mb-2">
              <Form.Label><FormattedMessage id="chem_spectra_layouts-data_type" /></Form.Label>
              <Form.Control
                type="text"
                name="dataType"
                value={newDataType.dataType}
                onChange={this.handleInputChange}
                className="py-2"
              />
            </Form.Group>
            <Form.Group>
              <Form.Label><FormattedMessage id="chem_spectra_layouts-layout" /></Form.Label>
              <Select
                name="layout"
                value={{ label: newDataType.layout, value: newDataType.layout }}
                onChange={this.handleSelectLayout}
                options={layoutsOptions}
                placeholder={intl.formatMessage({ id: 'chem_spectra_layouts-select_layout' })}
              />
            </Form.Group>
          </Form>

        </AppModal>

        <h3 className="bg-gray-200 p-3 rounded"><FormattedMessage id="chem_spectra_layouts-title" /></h3>
        <Table responsive hover bordered>
          <thead>
            <tr>
              <th>#</th>
              <th><FormattedMessage id="chem_spectra_layouts-data_type" /></th>
              <th><FormattedMessage id="chem_spectra_layouts-layout" /></th>
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
                    && !dataTypes.includes(entry.dataType)) && (
                      <div className="actions d-inline-block">
                        <OverlayTrigger
                          root
                          trigger="focus"
                          placement="top"
                          overlay={(
                            <Popover id="popover-positioned-scrolling-left">
                              <Popover.Header id="popover-positioned-scrolling-left" as="h5">
                                <FormattedMessage id="chem_spectra_layouts-delete_confirm" />
                              </Popover.Header>
                              <Popover.Body className="ps-5">
                                <Button
                                  size="sm"
                                  variant="danger"
                                  className="me-2"
                                  onClick={() => {
                                    this.handleDeleteDataType({ layout: entry.layout, dataType: entry.dataType });
                                  }}
                                >
                                  <FormattedMessage id="yes" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="warning"
                                  onClick={this.handleClick}
                                >
                                  <FormattedMessage id="no" />
                                </Button>
                              </Popover.Body>
                            </Popover>
                          )}
                        >
                          <Button
                            size="sm"
                            variant="danger"
                          >
                            <i className="fa fa-trash-o" />
                          </Button>
                        </OverlayTrigger>
                      </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  }
}

ChemSpectraLayouts.propTypes = {
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
};

export default injectIntl(ChemSpectraLayouts);
