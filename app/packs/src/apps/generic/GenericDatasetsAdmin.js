import React from 'react';
import ReactDOM from 'react-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { orderBy } from 'lodash';
import { Constants, Designer } from 'chem-generic-ui';
import SyncBtn from 'src/apps/generic/SyncButton';
import LoadingModal from 'src/components/common/LoadingModal';
import Notifications from 'src/components/Notifications';
import GenericDSsFetcher from 'src/fetchers/GenericDSsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { notification, submit } from 'src/apps/generic/Utils';
import {
  GenericAdminNav,
  GenericAdminUnauth,
} from 'src/apps/generic/GenericAdminNav';

export default class GenericDatasetsAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      show: { tab: '', modal: '' },
      revisions: [],
      repoData: [],
      user: {},
    };
    this.handleShowState = this.handleShowState.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.handleActivateKlass = this.handleActivateKlass.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.delRevision = this.delRevision.bind(this);
    this.fetchRevisions = this.fetchRevisions.bind(this);
    this.handleCreateRepo = this.handleCreateRepo.bind(this);
    this.handleShowRepo = this.handleShowRepo.bind(this);
  }

  componentDidMount() {
    this.fetchElements();
    UsersFetcher.fetchCurrentUser()
      .then(result => {
        if (!result.error) {
          this.setState({ user: result.user });
        }
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  getShowState(att, val) {
    return { ...this.state.show, [att]: val };
  }

  fetchElements() {
    GenericDSsFetcher.listDatasetKlass().then(result => {
      this.setState({ elements: result.klass });
    });
  }

  handleActivateKlass(e) {
    const act = e.is_active ? 'De-activate' : 'Activate';
    GenericDSsFetcher.deActivateKlass({
      id: e.id,
      is_active: !e.is_active,
      klass: 'DatasetKlass',
    })
      .then(result => {
        if (result.error) {
          notification({
            title: `${act} Dataset fail`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `${act} Dataset successfully`,
            lvl: 'info',
            msg: `${e.label} is ${act.toLowerCase()} now`,
          });
          this.closeModal(this.fetchElements);
          // this.fetchElements();
        }
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      });
  }

  handleShowState(att, val, cb = () => {}) {
    this.setState({ show: this.getShowState(att, val) }, cb);
  }

  closeModal(cb = () => {}) {
    this.handleShowState('modal', '', cb);
  }

  fetchRevisions(_element) {
    const element = _element;
    if (element?.id) {
      GenericDSsFetcher.fetchKlassRevisions(element.id, 'DatasetKlass').then(
        result => {
          let curr = Object.assign({}, { ...element.properties_template });
          curr = Object.assign(
            {},
            { properties_release: curr },
            { uuid: 'current' }
          );
          const revisions = [].concat(curr, result.revisions);
          this.setState({ revisions });
        }
      );
    }
  }

  delRevision(params) {
    const { id, data, uuid } = params;
    GenericDSsFetcher.deleteKlassRevision({
      id: id,
      klass_id: data?.id,
      klass: 'DatasetKlass',
    }).then(response => {
      if (response.error) {
        notification({
          title: 'Delete Revision',
          lvl: 'error',
          msg: response.error,
        });
      } else {
        this.fetchRevisions(data);
        notification({
          title: `Revision [${uuid}] deleted successfully`,
          lvl: 'info',
          msg: 'Deleted successfully',
        });
      }
    });
  }

  handleShowRepo() {
    LoadingActions.start();
    GenericDSsFetcher.fetchRepo().then(result => {
      if (result.error) {
        notification({
          title: 'Cannot connect to Chemotion Repository',
          lvl: 'error',
          msg: result.error,
        });
        LoadingActions.stop();
      } else {
        this.setState(
          { repoData: result, show: this.getShowState('modal', 'NewRepo') },
          () => LoadingActions.stop()
        );
      }

    });
  }

  handleCreateRepo(element) {
    GenericDSsFetcher.createRepo({ identifier: element['identifier'] }).then(
      result => {
        this.setState({ elements: result?.klass || this.state.elements });
      }
    );
    this.closeModal();
  }

  async handleSubmit(_element, _release = 'draft') {
    const [element, release] = [_element, _release];
    element.release = release;
    LoadingActions.start();
    const result = await submit(GenericDSsFetcher, { update: Constants.GENERIC_TYPES.DATASET, element, release });
    if (result.isSuccess) {
      notification(result);
      this.fetchElements();
      this.setState({ element: result.response }, () => LoadingActions.stop());
    } else {
      notification(result);
    }
    LoadingActions.stop();
  }

  renderGrid() {
    const { elements } = this.state;
    const els = orderBy(elements, ['is_active', 'label'], ['desc', 'asc']);
    return (
      <Designer
        fnCopy={() => {}}
        fnCreate={() => {}}
        fnSubmit={this.handleSubmit}
        fnActive={this.handleActivateKlass}
        fnDerive={() => {}}
        fnUpdate={() => {}}
        preview={{
          fnDelRevisions: this.delRevision,
          fnRevisions: this.fetchRevisions,
          revisions: this.state.revisions,
        }}
        genericType="Dataset"
        gridData={els}
      />
    );
  }

  render() {
    const { user } = this.state;
    if (!user.generic_admin?.datasets) {
      return <GenericAdminUnauth userName={user.name} text="GenericDatasets" />;
    }

    return (
      <div style={{ width: '90vw', margin: 'auto' }}>
        <GenericAdminNav userName={user.name} text="GenericDatasets" />
        <hr />
        <div style={{ marginTop: '60px' }}>
          <h3>Generic Datasets Designer</h3>
          <SyncBtn
            data={this.state.repoData}
            fnCreate={this.handleCreateRepo}
            fnModalClose={this.closeModal}
            fnModalOpen={this.handleShowRepo}
            genericType={Constants.GENERIC_TYPES.DATASET}
            klasses={this.state.klasses}
            showModal={this.state.show.modal === 'NewRepo'}
          />
          &nbsp;
          {this.renderGrid()}
        </div>
        <Notifications />
        <LoadingModal />
      </div>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('GenericDatasetsAdmin');
  if (domElement)
    ReactDOM.render(
      <DndProvider backend={HTML5Backend}>
        <GenericDatasetsAdmin />
      </DndProvider>,
      domElement
    );
});
