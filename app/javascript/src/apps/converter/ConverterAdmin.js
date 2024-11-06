import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Button, Breadcrumb, Container, Col, Modal, Row } from 'react-bootstrap';
import { ProfileList, ProfileForm, FileUploadForm } from '@complat/chemotion-converter-client';
import ConverterApi from 'src/fetchers/ConverterFetcher';
import GenericDSsFetcher from 'src/fetchers/GenericDSsFetcher';

class ConverterAdmin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: 'list',
      client: null,
      selectedFile: null,
      profiles: [],
      options: [],
      datasets: [],
      profile: null,
      error: false,
      errorMessage: '',
      isLoading: false,
      createdModal: false,
      deleteModal: false
    };

    this.showListView = this.showListView.bind(this);
    this.showCreateView = this.showCreateView.bind(this);
    this.showUpdateView = this.showUpdateView.bind(this);
    this.showImportView = this.showImportView.bind(this);

    this.showCreatedModal = this.showCreatedModal.bind(this);
    this.hideCreatedModal = this.hideCreatedModal.bind(this);

    this.showDeleteModal = this.showDeleteModal.bind(this);
    this.hideDeleteModal = this.hideDeleteModal.bind(this);

    this.updateProfile = this.updateProfile.bind(this);
    this.storeProfile = this.storeProfile.bind(this);
    this.deleteProfile = this.deleteProfile.bind(this);
    this.downloadProfile = this.downloadProfile.bind(this);

    this.updateFile = this.updateFile.bind(this);
    this.uploadFile = this.uploadFile.bind(this);
    this.importFile = this.importFile.bind(this);

    this.dispatchView = this.dispatchView.bind(this);
  }

  componentDidMount() {
    Promise.all([
      ConverterApi.fetchProfiles(),
      GenericDSsFetcher.listDatasetKlass(),
      ConverterApi.fetchOptions()
    ]).then((responses) => {
      const [profiles, klass, options] = responses;
      const datasets = klass?.klass?.map((kl) => {
        const pr = kl.properties_release;
        pr.name = kl.label;
        pr.ols = kl.ols_term_id;
        return pr;
      }) || [];

      console.log(options?.client);
      this.setState({
        // eslint-disable-next-line max-len
        profiles: profiles?.profiles || [], datasets, options: options?.options || [], client: options?.client || null
      });
    });
  }

  showListView() {
    this.setState({
      status: 'list',
      profile: null
    });
  }

  showImportView() {
    this.setState({
      status: 'import',
      profile: null
    });
  }

  showCreateView() {
    this.setState({
      status: 'upload',
      profile: null
    });
  }

  showUpdateView(profile) {
    this.setState({
      status: 'update',
      profile: { ...profile },
      error: false,
      errorMessage: ''
    });
  }

  showCreatedModal() {
    this.setState({
      createdModal: true
    });
  }

  hideCreatedModal() {
    this.setState({
      createdModal: false
    });
  }

  showDeleteModal(profile) {
    this.setState({
      deleteModal: true,
      profile: { ...profile },
    });
  }

  hideDeleteModal() {
    this.setState({
      deleteModal: false,
      profile: null
    });
  }

  updateProfile(profile) {
    this.setState({ profile });
  }

  storeProfile() {
    const { status, profile } = this.state;

    // remove show flag
    if (Array.isArray(profile.identifiers)) {
      profile.identifiers.forEach((identifier) => {
        // eslint-disable-next-line no-param-reassign
        delete identifier.show;
      });
    }

    if (status === 'create') {
      ConverterApi.createProfile(profile)
        .then((response) => {
          const profiles = [...this.state.profiles];
          profiles.push(response);
          this.setState({
            status: 'list',
            profiles,
            profile: null
          }, this.showCreatedModal());
        });
    } else if (status === 'update') {
      ConverterApi.updateProfile(profile)
        .then((response) => {
          const profiles = [...this.state.profiles]
          const index = profiles.findIndex((p) => (p.id === response.id));
          profiles[index] = response;
          this.setState({
            status: 'list',
            profiles,
            profile: null
          });
        });
    }
  }

  deleteProfile() {
    ConverterApi.deleteProfile(this.state.profile)
      .then(() => {
        const profiles = [...this.state.profiles]
        const index = profiles.findIndex(p => (p.id == this.state.profile.id))
        profiles.splice(index, 1)
        this.setState({
          status: 'list',
          profiles: profiles,
          profile: null
        }, this.hideDeleteModal())
      }
    )
  }

  downloadProfile(profile) {
    const a = document.createElement('a')
    a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(profile, null, 2))
    a.download = profile.id + '.json'
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
    })
  }

  uploadFile() {
    const { selectedFile } = this.state

    this.setState({
      isLoading: true
    })

    ConverterApi.fetchTables(selectedFile)
      .then(data => {
        if (data) {
          const profile = {
            title: '',
            description: '',
            tables: [],
            identifiers: [],
            data: data,
          }

          this.setState({
            status: 'create',
            profile: profile,
            selectedFile: null,
            isLoading: false,
            error: false,
            errorMessage: ''
          })
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
    const { selectedFile } = this.state

    this.setState({
      isLoading: true
    })

    const createProfile = e => {
      const fileProfile = JSON.parse(e.target.result)

      ConverterApi.createProfile(fileProfile)
        .then(profile => {
          const profiles = [...this.state.profiles]
          profiles.push(profile)
          this.setState({
            status: 'list',
            profiles: profiles,
            profile: null
          }, this.showCreatedModal())
        })
        .catch(errors => {
          this.setState({
            error: true,
            errorMessage: Object.values(errors).join(', '),
            isLoading: false
          })
        })
    }

    const reader = new FileReader()
    reader.readAsText(selectedFile)
    reader.onload = createProfile.bind(this)
  }

  dispatchView() {
    if (this.state.status === 'list') {
      return (
        <ProfileList
          profiles={this.state.profiles}
          isAdmin={this.state.client !== null}
          updateProfile={this.showUpdateView}
          deleteProfile={this.showDeleteModal}
          downloadProfile={this.downloadProfile}
        />
      )
    } else if (this.state.status == 'import') {
      return (
        <FileUploadForm
          onFileChangeHandler={this.updateFile}
          onSubmitFileHandler={this.importFile}
          errorMessage={this.state.errorMessage}
          error={this.state.error}
          isLoading={this.state.isLoading}
          disabled={this.state.selectedFile === null}
        />
      )
    } else if (this.state.status == 'upload') {
      return (
        <FileUploadForm
          onFileChangeHandler={this.updateFile}
          onSubmitFileHandler={this.uploadFile}
          errorMessage={this.state.errorMessage}
          error={this.state.error}
          isLoading={this.state.isLoading}
          disabled={this.state.selectedFile === null}
        />
      );
    } else {
      return (
        <ProfileForm
          status={this.state.status}
          profile={this.state.profile}
          options={this.state.options}
          datasets={this.state.datasets}
          updateProfile={this.updateProfile}
          storeProfile={this.storeProfile}
        />
      )
    }
  }

  render() {
    const { client, status, profile, createdModal, deleteModal } = this.state;

    return (
      <Container fluid={['create', 'update'].includes(status)}>
        <Breadcrumb className="mt-4">
          <Breadcrumb.Item
            onClick={this.showListView}
            active={status === 'list'}
          >
            Chemotion file converter admin
          </Breadcrumb.Item>

          {['upload', 'create'].includes(status) && (
            <Breadcrumb.Item active>Create Profile</Breadcrumb.Item>
          )}
          {status === 'update' && (
            <Breadcrumb.Item active>{'Edit Profile: ' + profile.title}</Breadcrumb.Item>
          )}
          {status === 'import' && (
            <Breadcrumb.Item active>Import Profile</Breadcrumb.Item>
          )}
        </Breadcrumb>

        <Row className="mb-3">
          <Col>
            <h2>
              {status === 'list' && 'Profiles List'}
              {['upload', 'create'].includes(status) && 'Create Profile'}
              {status === 'update' && 'Edit Profile'}
              {status === 'import' && 'Import Profile'}
            </h2>
          </Col>

          {status === 'list' && client !== null && (
            <Col md={4} className="d-flex justify-content-end gap-2">
              <Button variant="success" onClick={this.showImportView}>
                Import profile
              </Button>
              <Button variant="primary" onClick={this.showCreateView}>
                Create new profile
              </Button>
            </Col>
          )}
        </Row>

        <main>
          {this.dispatchView()}
        </main>

        <div>
          <a href="/">Back to MyDB</a>
        </div>

        <Modal centered show={createdModal}>
          <Modal.Header>
            <Modal.Title>Profile successfully created!</Modal.Title>
          </Modal.Header>

          <Modal.Footer>
            <Button variant="primary" onClick={this.hideCreatedModal}>Great!</Button>
          </Modal.Footer>
        </Modal>

        <Modal centered show={deleteModal}>
          <Modal.Header>
            <Modal.Title>Do you really want to delete this profile?</Modal.Title>
          </Modal.Header>
          <Modal.Footer>
            <Button variant="light" onClick={this.hideDeleteModal}>Cancel</Button>
            <Button variant="danger" onClick={this.deleteProfile}>Delete profile</Button>
          </Modal.Footer>
        </Modal>
      </Container>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('ConverterAdmin');
  if (domElement) ReactDOM.render(<ConverterAdmin />, domElement);
});
