import React from 'react';
import ReactDOM from 'react-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { orderBy } from 'lodash';
import { Constants, Designer } from 'chem-generic-ui';
import SyncBtn from 'src/apps/generic/SyncButton';
import LoadingModal from 'src/components/common/LoadingModal';
import Notifications from 'src/components/Notifications';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { notification, submit } from 'src/apps/generic/Utils';
import {
  GenericAdminNav,
  GenericAdminUnauth,
} from 'src/apps/generic/GenericAdminNav';

const validateKlass = klass => /\b[a-z]{3,5}\b/g.test(klass);
const validateInput = element => {
  if (element.name === '') {
    notification({
      title: `Element [${element.name}]`,
      lvl: 'error',
      msg: 'Please input Element.',
    });
    return false;
  }
  if (element.klass_prefix === '') {
    notification({
      title: `Element [${element.name}]`,
      lvl: 'error',
      msg: 'Please input Prefix.',
    });
    return false;
  }
  if (element.label === '') {
    notification({
      title: `Element [${element.name}]`,
      lvl: 'error',
      msg: 'Please input Element Label.',
    });
    return false;
  }
  if (element.icon_name === '') {
    notification({
      title: `Element [${element.name}]`,
      lvl: 'error',
      msg: 'Please input Icon.',
    });
    return false;
  }
  return true;
};

export default class GenericElementsAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      element: {},
      show: { tab: '', modal: '' },
      revisions: [],
      repoData: [],
      user: {},
    };

    this.fetchElements = this.fetchElements.bind(this);
    this.handleShowState = this.handleShowState.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.handleCreateKlass = this.handleCreateKlass.bind(this);
    this.handleUpdateKlass = this.handleUpdateKlass.bind(this);
    this.handleActivateKlass = this.handleActivateKlass.bind(this);
    this.handleDeleteKlass = this.handleDeleteKlass.bind(this);
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

  handleShowRepo() {
    LoadingActions.start();
    GenericElsFetcher.fetchRepo().then(result => {
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
    GenericElsFetcher.createRepo({ identifier: element['identifier'] }).then(
      result => {
        if (result?.status === 'success') {
          this.setState({ elements: result?.klass || this.state.elements });
        }
        notification({
          title: 'Sync from LabIMotion Hub',
          lvl: result?.status || 'error',
          msg: result?.message || 'Unknown error',
        });
      }
    );
    this.closeModal();
  }

  getShowState(att, val) {
    return { ...this.state.show, [att]: val };
  }

  handleShowState(att, val, cb = () => {}) {
    this.setState({ show: this.getShowState(att, val) }, cb);
  }

  closeModal(cb = () => {}) {
    this.handleShowState('modal', '', cb);
  }

  handleCreateKlass(_response) {
    const { element, notify } = _response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    element.is_generic = true;
    if (!validateInput(element)) return;
    if (!validateKlass(element.name)) {
      notification({
        title: `Element [${element.name}]`,
        lvl: 'error',
        msg: 'This Element is invalid, please try a different one.',
      });
      return;
    }
    const { elements } = this.state;
    const existKlass = elements.filter(el => el.name === element.name);
    if (existKlass.length > 0) {
      notification({
        title: `Element [${element.name}]`,
        lvl: 'error',
        msg: 'This Element is already taken. Please choose another one.',
      });
      return;
    }
    LoadingActions.start();
    GenericElsFetcher.createElementKlass(element)
      .then(result => {
        if (result.error) {
          notification({
            title: `Element [${element.name}]`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `Element [${element.name}]`,
            lvl: 'info',
            msg: 'Created successfully',
          });
          this.fetchElements();
        }
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  }

  handleUpdateKlass(_response) {
    const { element, notify } = _response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    const inputs = element;
    if (!validateInput(element)) return;
    LoadingActions.start();
    GenericElsFetcher.updateElementKlass(inputs)
      .then(result => {
        if (result.error) {
          notification({
            title: `Element [${inputs.name}]`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `Element [${inputs.name}]`,
            lvl: 'info',
            msg: 'Updated successfully',
          });
          this.fetchElements();
        }
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  }

  handleActivateKlass(e) {
    const act = e.is_active ? 'De-activate' : 'Activate';
    LoadingActions.start();
    GenericElsFetcher.deActivateKlass({
      id: e.id,
      is_active: !e.is_active,
      klass: 'ElementKlass',
    })
      .then(result => {
        if (result.error) {
          notification({
            title: `${act} Element failed`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `${act} Element [${result.name}] successfully`,
            lvl: 'info',
            msg: `Element is ${act.toLowerCase()} now`,
          });
          this.fetchElements();
        }
      })
      .finally(() => {
        LoadingActions.stop();
      });
  }

  handleDeleteKlass(element) {
    if (element.is_active) {
      notification({
        title: 'Delete failed',
        lvl: 'error',
        msg: `You cannot delete an active element [${element.name}]. Please make it [inactive] first.`,
      });
      return;
    }
    const confirmed = confirm('Are you sure you want to delete this record?');
    if (confirmed) {
      GenericElsFetcher.deleteKlass({
        id: element.id,
        klass: 'ElementKlass',
      })
        .then(result => {
          if (result.error) {
            notification({
              title: `Element [${element.name}]`,
              lvl: 'error',
              msg: result.error,
            });
          } else {
            notification({
              title: `Element [${element.name}]`,
              lvl: 'info',
              msg: 'Deleted successfully',
            });
            this.fetchElements();
          }
        })
        .finally(() => {
          LoadingActions.stop();
        });
    }
  }

  fetchRevisions(_element) {
    const element = _element;
    if (element?.id) {
      GenericElsFetcher.fetchKlassRevisions(element.id, 'ElementKlass').then(
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
    LoadingActions.start();
    GenericElsFetcher.deleteKlassRevision({
      id: id,
      klass_id: data?.id,
      klass: 'ElementKlass',
    })
      .then(response => {
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
      })
      .finally(() => {
        LoadingActions.stop();
      });
  }

  fetchElements() {
    GenericElsFetcher.fetchElementKlasses().then(result => {
      if (
        typeof result !== 'undefined' &&
        typeof result.klass !== 'undefined' &&
        result?.klass?.length > 0
      )
        this.setState(
          { elements: result.klass.filter(k => k.is_generic) },
          () => LoadingActions.stop()
        );
    });
  }

  async handleSubmit(_element, _release = 'draft') {
    const [element, release] = [_element, _release];
    element.release = release;
    LoadingActions.start();
    const result = await submit(GenericElsFetcher, { update: Constants.GENERIC_TYPES.ELEMENT, element, release });
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
    const els = orderBy(
      elements,
      ['is_active', 'name', 'klass_prefix'],
      ['desc', 'asc', 'asc']
    );
    return (
      <Designer
        fnCopy={this.handleCreateKlass}
        fnCreate={this.handleCreateKlass}
        fnSubmit={this.handleSubmit}
        fnActive={this.handleActivateKlass}
        fnDelete={this.handleDeleteKlass}
        fnUpdate={this.handleUpdateKlass}
        preview={{
          fnDelRevisions: this.delRevision,
          fnRevisions: this.fetchRevisions,
          revisions: this.state.revisions,
        }}
        genericType="Element"
        gridData={els}
      />
    );
  }

  render() {
    const { user } = this.state;
    if (!user.generic_admin?.elements) {
      return <GenericAdminUnauth userName={user.name} text="GenericElements" />;
    }

    return (
      <div style={{ width: '90vw', margin: 'auto' }}>
        <GenericAdminNav userName={user.name} text="GenericElements" />
        <hr />
        <div style={{ marginTop: '60px' }}>
          <h3>Generic Elements Designer</h3>
          <SyncBtn
            data={this.state.repoData}
            fnCreate={this.handleCreateRepo}
            fnModalClose={this.closeModal}
            fnModalOpen={this.handleShowRepo}
            genericType={Constants.GENERIC_TYPES.ELEMENT}
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
  const domElement = document.getElementById('GenericElementsAdmin');
  if (domElement)
    ReactDOM.render(
      <DndProvider backend={HTML5Backend}>
        <GenericElementsAdmin />
      </DndProvider>,
      domElement
    );
});
