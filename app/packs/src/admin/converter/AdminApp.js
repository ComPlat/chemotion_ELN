import React, { Component } from 'react';
import { Button } from 'react-bootstrap';
import ConverterApi from '../../components/fetchers/ConverterFetcher';
import ProfileNewModal from './create/ProfileNewModal';

import ProfileList from './list/ProfileList';
import ProfileEdit from './edit/ProfileEdit';
import ProfileCreate from './create/ProfileCreate';


const initTable = (tableData) => {
  const header = {};
  if (tableData) {
    // eslint-disable-next-line guard-for-in
    for (const key in tableData.options) {
      header[key] = tableData.options[key][0];
    }
  }
  return {
    header,
    table: {}
  };
};

class AdminApp extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: 'list',
      clientId: '',
      selectedFile: null,
      profiles: [],
      tableData: null,
      columnList: null,
      headerOptions: [],
      error: false,
      isLoading: false,
      uploadModal: false,
      uploadType: '',
      errorMessage: '',
      title: '',
      description: '',
      tables: [],
      identifiers: [],
      firstRowIsHeader: [],
      currentIdentifier: '',
      currentIndex: -1,
    };

    this.showImportView = this.showImportView.bind(this);
    this.showEditView = this.showEditView.bind(this);
    this.updateTitle = this.updateTitle.bind(this);
    this.updateDescription = this.updateDescription.bind(this);
    this.addTable = this.addTable.bind(this);
    this.updateTable = this.updateTable.bind(this);
    this.removeTable = this.removeTable.bind(this);
    this.addHeader = this.addHeader.bind(this);
    this.updateHeader = this.updateHeader.bind(this);
    this.removeHeader = this.removeHeader.bind(this);
    this.addOperation = this.addOperation.bind(this);
    this.updateOperation = this.updateOperation.bind(this);
    this.removeOperation = this.removeOperation.bind(this);
    this.addIdentifier = this.addIdentifier.bind(this);
    this.updateIdentifier = this.updateIdentifier.bind(this);
    this.removeIdentifier = this.removeIdentifier.bind(this);
    this.toggleFirstRowIsHeader = this.toggleFirstRowIsHeader.bind(this);
    this.updateFirstRowIsHeader = this.updateFirstRowIsHeader.bind(this);
    this.createProfile = this.createProfile.bind(this);
    this.updateProfile = this.updateProfile.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
    this.downloadProfile = this.downloadProfile.bind(this);
    this.updateFile = this.updateFile.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.importFile = this.importFile.bind(this);
    this.dispatchView = this.dispatchView.bind(this);
    this.getTitleforStatus = this.getTitleforStatus.bind(this);
    this.showUploadModal = this.showUploadModal.bind(this);
    this.hideUploadModal = this.hideUploadModal.bind(this);
    this.showImportModal = this.showImportModal.bind(this);
    this.handleCreate = this.handleCreate.bind(this);
    this.handleUpload = this.handleUpload.bind(this);
    this.handleImport = this.handleImport.bind(this);
    this.backProfileList = this.backProfileList.bind(this);
  }

  componentDidMount() {
    ConverterApi.fetchProfiles()
      .then((profiles) => {
        if (profiles) this.setState({ profiles: profiles.profiles, clientId: profiles.client });
      });
  }

  getTitleforStatus() {
    if (this.state.status === 'list') {
      return `Profiles List [ ${this.state.clientId} ]`;
    } else if (this.state.status === 'edit') {
      return 'Update Profile';
    } else if (this.state.status === 'import') {
      return 'Import Profile';
    }
    return 'Create Profile';
  }

  showImportView() {
    this.setState({ status: 'import' });
  }

  showUploadModal() {
    this.setState({ uploadModal: true, uploadType: 'new' });
  }

  showImportModal() {
    this.setState({ uploadModal: true, uploadType: 'import' });
  }


  hideUploadModal() {
    this.setState({ uploadModal: false, uploadType:'' });
  }

  showEditView(index, identifier) {
    const currentProfile = this.state.profiles[index];
    this.setState({
      status: 'edit',
      currentIdentifier: identifier,
      currentIndex: index,
      id: currentProfile.id,
      title: currentProfile.title,
      description: currentProfile.description,
      identifiers: currentProfile.identifiers,
      header: currentProfile.header,
      tables: currentProfile.tables,
      firstRowIsHeader: currentProfile.firstRowIsHeader
    });
  }

  updateTitle(title) {
    this.setState({
      title
    });
  }

  updateDescription(description) {
    this.setState({
      description
    });
  }

  addTable() {
    const { tables, tableData } = this.state;
    tables.push(initTable(tableData));
    this.setState({ tables });
  }

  updateTable(index, key, value) {
    const tables = [...this.state.tables]
    if (index !== -1) {
      tables[index].table[key] = value

      // remove the column if tableIndex and columnIndex is null
      if (Object.values(tables[index].table[key]).every(value => (value === null || isNaN(value)))) {
        delete tables[index].table[key];
      }

      this.setState({ tables });
    }
  }

  removeTable(index) {
    const tables = [...this.state.tables];
    tables.splice(index, 1);
    this.setState({ tables });
  }

  addHeader(index) {
    const tables = [...this.state.tables]
    if (index !== -1) {
      const key = `HEADER${Object.keys(tables[index].header).length}`;
      tables[index].header[key] = '';
    }
    this.setState({ tables });
  }

  updateHeader(index, key, value, oldKey) {
    const tables = [...this.state.tables];
    if (index !== -1) {
      if (oldKey === undefined) {
        tables[index].header[key] = value;
      } else {
        // create a new header to preserve the order
        tables[index].header = Object.keys(tables[index].header).reduce((agg, cur) => {
          if (cur == oldKey) {
            agg[key] = value;
          } else {
            agg[cur] = tables[index].header[cur];
          }
          return agg;
        }, {});
      }
      this.setState({ tables });
    }
  }

  removeHeader(index, key) {
    const tables = [...this.state.tables];
    delete tables[index].header[key];
    this.setState({ tables });
  }

  addOperation(index, key, type) {
    const tables = [...this.state.tables];
    if (index !== -1) {
      const operation = {
        type,
        operator: '+'
      };
      if (type == 'column') {
        operation['column'] = {
          tableIndex: null,
          columnIndex: null
        };
      }

      if (tables[index].table[key] === undefined) {
        tables[index].table[key] = [];
      }
      tables[index].table[key].push(operation);
      this.setState({ tables });
    }
  }

  updateOperation(index, key, opIndex, opKey, value) {
    const tables = [...this.state.tables];
    if (index !== -1) {
      tables[index].table[key][opIndex][opKey] = value;
      this.setState({ tables });
    }
  }

  removeOperation(index, key, opIndex) {
    const tables = [...this.state.tables];
    if (index !== -1) {
      tables[index].table[key].splice(opIndex, 1);

      // remove operations if it is empty
      if (tables[index].table[key].length == 0) {
        delete tables[index].table[key];
      }

      this.setState({ tables });
    }
  }

  addIdentifier(type) {
    const { identifiers } = this.state

    let metadataKey = '';
    let value = '';
    if (type === 'metadata' && this.state.status == 'create') {
      metadataKey = Object.keys(this.state.tableData.metadata)[0];
      value = this.state.tableData.metadata[metadataKey];
    }

    const identifier = {
      type,
      tableIndex: 0,
      lineNumber: '',
      metadataKey,
      headerKey: '',
      value,
      isRegex: false
    };

    identifiers.push(identifier);
    this.setState({ identifiers });
  }

  updateIdentifier(index, data) {
    const identifiers = [...this.state.identifiers];
    if (index !== -1) {
      const identifier = identifiers[index];
      Object.assign(identifier, data);
      identifiers[index] = identifier;
      this.setState({ identifiers });
    }
  }

  removeIdentifier(index) {
    const identifiers = [...this.state.identifiers];
    if (index !== -1) {
      identifiers.splice(index, 1);
      this.setState({ identifiers });
    }
  }

  updateFirstRowIsHeader(index, checked) {
    const firstRowIsHeader = [...this.state.firstRowIsHeader];
    firstRowIsHeader[index] = checked;
    this.setState({ firstRowIsHeader });
  }

  toggleFirstRowIsHeader(index) {
    const { tableData } = this.state;
    const table = tableData.data[index];

    if (table.firstRowIsHeader) {
      table.firstRowIsHeader = false;
      table.columns = table._columns;
      table.rows.splice(0, 0, table._first);
      table._columns = null;
      table._first = null;
    } else {
      table.firstRowIsHeader = true;
      table._columns = table.columns;
      table._first = table.rows.shift();
      table.columns = table._first.map((value, idx) => {
        const originalName = table._columns[idx].name;

        return {
          key: idx.toString(),
          name: value + ` (${originalName})`
        }
      })
    }

    const firstRowIsHeader = tableData.data.map(_table => _table.firstRowIsHeader || false);

    this.setState({ tableData, firstRowIsHeader });
  }


  handleImport(context) {
    const { uploadType } = this.state;
    if (uploadType === 'import') {
      this.handleUpload(context);
    }
    if (uploadType === 'new') {
      this.handleCreate(context);
    }
  }

  handleUpload(context) {
    const createProfile = (e) => {
      const profile = JSON.parse(e.target.result);

      ConverterApi.createProfile(profile)
        .then(() => {
          ConverterApi.fetchProfiles()
            .then((profiles) => {
              this.setState({ profiles: profiles.profiles, uploadModal: false, uploadType: '' });
            });
        })
        .catch((errors) => {
          this.setState({
            error: true,
            errorMessage: Object.values(errors).join(', '),
            isLoading: false
          });
        });
    };

    const reader = new FileReader();
    reader.readAsText(context);
    reader.onload = createProfile.bind(this);
  }

  handleCreate(context) {
    const { uploadType } = this.state;
    console.log(uploadType);

    let profile = context;
    if (uploadType === 'import') {
      console.log(context);
      profile = JSON.parse(context);
    }

    console.log(profile);
    ConverterApi.fetchTables(profile)
      .then((tableData) => {
        if (tableData.error) {
          //
        } else {
          // create a flat list of all columns
          const columnList = tableData.data.reduce((accumulator, table, tableIndex) => {
            const tableColumns = table.columns.map((tableColumn, columnIndex) => {
              return Object.assign({}, tableColumn, {
                label: `Table #${tableIndex} Column #${columnIndex}`,
                value: {
                  tableIndex,
                  columnIndex
                }
              });
            });
            return accumulator.concat(tableColumns);
          }, []);

          this.setState({
            selectedFile: null,
            isLoading: false,
            tableData,
            columnList,
            headerOptions: tableData.options,
            tables: [initTable(tableData)],
            identifiers: [],
            firstRowIsHeader: tableData.data.map(table => false),
            error: false,
            status: 'create',
            errorMessage: ''
          });
        }
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    this.hideUploadModal();
  }
  backProfileList(event) {
    this.setState({
      status: 'list',
      title: '',
      description: '',
      identifiers: [],
      header: {},
      table: {},
      currentIdentifier: '',
      currentIndex: -1,
     });
  }

  createProfile(event) {
    event.preventDefault();

    const {
      title, description, tables, identifiers, tableData, firstRowIsHeader
    } = this.state;
    const profile = {
      title,
      description,
      tables,
      identifiers,
      firstRowIsHeader
    };

    ConverterApi.createProfile(profile)
      .then((data) => {
        const newProfiles = [...this.state.profiles];
        newProfiles.push(data);
        this.setState({
          profiles: newProfiles,
          status: 'list',
          title: '',
          description: '',
          identifiers: [],
          header: {},
          table: {},
          currentIdentifier: '',
          currentIndex: -1,
          showAlert: true
        });
        // $('#modal').show()
      })
      .catch(() => ({
        errors: {
          path: 'File not found'
        }
      }));
  }

  updateProfile() {
    const {
      id, title, description, tables, identifiers, tableData, firstRowIsHeader
    } = this.state;
    const profile = {
      id,
      title,
      description,
      tables,
      identifiers,
      firstRowIsHeader
    };

    ConverterApi.updateProfile(profile, this.state.currentIdentifier)
      .then((data) => {
        const newProfiles = [...this.state.profiles];
        newProfiles[this.state.currentIndex] = data;
        this.setState({
          profiles: newProfiles,
          status: 'list',
          title: '',
          description: '',
          identifiers: [],
          header: {},
          table: {},
          currentIdentifier: '',
          currentIndex: -1,
          showAlert: true
        });
      });
  }

  // deleteProfile() {
  deleteProfile(index, identifier) {
    ConverterApi.deleteProfile(identifier)
      .then(() => {
        const newProfiles = [...this.state.profiles];
        if (index !== -1) {
          newProfiles.splice(index, 1);
          this.setState({
            profiles: newProfiles,
          });
        }
      });
  }

  downloadProfile(index, identifier) {
    const a = document.createElement('a');
    a.href = `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(this.state.profiles[index], null, 2))}`;
    a.download = `${identifier}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  updateFile(event) {
    this.setState({
      selectedFile: event.target.files[0],
      loaded: 0,
      isLoading: false,
      error: false,
      errorMessage: ''
    });
  }

  uploadFile() {
    const { selectedFile } = this.state;

    this.setState({
      isLoading: true
    });

    ConverterApi.fetchTables(selectedFile)
      .then((tableData) => {
        if (tableData) {
          // create a flat list of all columns
          const columnList = tableData.data.reduce((accumulator, table, tableIndex) => {
            const tableColumns = table.columns.map((tableColumn, columnIndex) => Object.assign({}, tableColumn, {
              label: `Table #${tableIndex} Column #${columnIndex}`,
              value: {
                tableIndex,
                columnIndex
              }
            }));
            return accumulator.concat(tableColumns);
          }, []);

          this.setState({
            selectedFile: null,
            isLoading: false,
            tableData,
            columnList,
            headerOptions: tableData.options,
            tables: [initTable(tableData)],
            identifiers: [],
            firstRowIsHeader: tableData.data.map(() => false),
            error: false,
            errorMessage: ''
          });
        }
      })
      .catch(error => {
        if (error.status === 413) {
          this.setState({
            error: true,
            errorMessage: 'The uploaded file is too large.',
            isLoading: false
          })
        } else {
          error.text().then(errorMessage => {
            this.setState({
              error: true,
              errorMessage: JSON.parse(errorMessage).error,
              isLoading: false
            })
          })
        }
      })
  }

  importFile() {
    const { selectedFile } = this.state;

    this.setState({
      isLoading: true
    });

    const createProfile = e => {
      const profile = JSON.parse(e.target.result)

      ConverterApi.createProfile(profile)
        .then(data => {
          this.setState({
            status: 'list',
            selectedFile: null,
            isLoading: false,
            error: false,
            errorMessage: ''
          })
        })
        .catch(errors => {
          this.setState({
            error: true,
            errorMessage: Object.values(errors).join(', '),
            isLoading: false
          })
        })
    }

    const reader = new FileReader();
    reader.readAsText(selectedFile);
    reader.onload = createProfile.bind(this);
  }

  dispatchView() {
    const {
      tableData, status, error, errorMessage, isLoading, selectedFile
    } = this.state;

    if (status === 'list') {
      return (
        <ProfileList
          profiles={this.state.profiles}
          editProfile={this.showEditView}
          deleteProfile={this.deleteProfile}
          downloadProfile={this.downloadProfile}
        />
      );
    } else if (status === 'edit') {
      return (
        <ProfileEdit
          id={this.state.id}
          title={this.state.title}
          description={this.state.description}
          tables={this.state.tables}
          identifiers={this.state.identifiers}
          firstRowIsHeader={this.state.firstRowIsHeader}
          updateTitle={this.updateTitle}
          updateDescription={this.updateDescription}
          addTable={this.addTable}
          updateTable={this.updateTable}
          removeTable={this.removeTable}
          addHeader={this.addHeader}
          updateHeader={this.updateHeader}
          removeHeader={this.removeHeader}
          addOperation={this.addOperation}
          updateOperation={this.updateOperation}
          removeOperation={this.removeOperation}
          addIdentifier={this.addIdentifier}
          updateIdentifier={this.updateIdentifier}
          removeIdentifier={this.removeIdentifier}
          updateFirstRowIsHeader={this.updateFirstRowIsHeader}
          updateProfile={this.updateProfile}
          backProfileList={this.backProfileList}
        />
      );
    } else if (status === 'create') {
      if (tableData) {
        return (
          <ProfileCreate
            tableData={this.state.tableData}
            columnList={this.state.columnList}
            toggleFirstRowIsHeader={this.toggleFirstRowIsHeader}
            headerOptions={this.state.headerOptions}
            title={this.state.title}
            description={this.state.description}
            identifiers={this.state.identifiers}
            tables={this.state.tables}
            updateTitle={this.updateTitle}
            updateDescription={this.updateDescription}
            addTable={this.addTable}
            updateTable={this.updateTable}
            removeTable={this.removeTable}
            updateHeader={this.updateHeader}
            addOperation={this.addOperation}
            updateOperation={this.updateOperation}
            removeOperation={this.removeOperation}
            addIdentifier={this.addIdentifier}
            updateIdentifier={this.updateIdentifier}
            removeIdentifier={this.removeIdentifier}
            createProfile={this.createProfile}
            backProfileList={this.backProfileList}
          />
        );
      }
    }
    return (<span />);
  }


  render() {
    return (
      <div>
        <header>
          <nav aria-label="breadcrumb">
            {this.state.status === 'list' &&
              <ol className="breadcrumb">
                <li className="breadcrumb-item active" aria-current="page">Chemotion file converter admin</li>
              </ol>
            }
            {this.state.status === 'edit' &&
              <ol className="breadcrumb">
                <li className="breadcrumb-item" aria-current="page">Chemotion file converter admin</li>
                <li className="breadcrumb-item active" aria-current="page">Edit Profile: + {this.state.title}</li>
              </ol>
            }
            {this.state.status === 'create' &&
              <ol className="breadcrumb">
                <li className="breadcrumb-item" aria-current="page">Chemotion file converter admin</li>
                <li className="breadcrumb-item active" aria-current="page">Create Profile</li>
              </ol>
            }
            {this.state.status === 'import' &&
              <ol className="breadcrumb">
                <li className="breadcrumb-item" aria-current="page">Chemotion file converter admin</li>
                <li className="breadcrumb-item active" aria-current="page">Import Profile</li>
              </ol>
            }
          </nav>

          <div>
            {this.state.status === 'list' &&
              <div className="float-right">
                <Button bsStyle="info" bsSize="small" onClick={this.showImportModal}>
                  Import profile&nbsp;<i className="fa fa-upload" aria-hidden="true" />
                </Button>&nbsp;&nbsp;
                <Button bsStyle="primary" bsSize="small" onClick={this.showUploadModal}>
                  Create new profile&nbsp;<i className="fa fa-plus" aria-hidden="true" />
                </Button>

              </div>
            }

            <h2 className="mb-0">{this.getTitleforStatus()}</h2>
          </div>
        </header>

        <main>
          {this.dispatchView()}
        </main>

        <ProfileNewModal
          content="Profile"
          showModal={this.state.uploadModal}
          fnClose={this.hideUploadModal}
          fnCreate={this.handleImport}
        />

        <div className="modal modal-backdrop" data-backdrop="static" id="modal" tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body">
                <div className="alert alert-success" role="alert">Profile successfully created!</div>
              </div>
              <div className="modal-footer">
                <a href="." className="btn btn-secondary">Back to profiles list</a>
                <a href="/" className="btn btn-primary">Upload file and use profile</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default AdminApp;
