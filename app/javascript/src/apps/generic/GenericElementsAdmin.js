import React from 'react';
import ReactDOM from 'react-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { orderBy } from 'lodash';
import { Constants, Designer } from 'chem-generic-ui';
import LoadingModal from 'src/components/common/LoadingModal';
import Notifications from 'src/components/Notifications';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import GenericKlassFetcher from 'src/fetchers/GenericKlassFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { GenericMenu, Unauthorized } from 'src/apps/generic/GenericUtils';
import { notification, submit } from 'src/apps/generic/Utils';

const FN_ID = 'GenericElements';

export default class GenericElementsAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      element: {},
      show: { tab: '', modal: '' },
      revisions: [],
      repoData: [],
      currentUser: {},
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
    this.handleUploadKlass = this.handleUploadKlass.bind(this);
    this.handleDownloadKlass = this.handleDownloadKlass.bind(this);
  }

  componentDidMount() {
    LoadingActions.start();
    Promise.all([GenericElsFetcher.fetchElementKlasses(), UsersFetcher.fetchCurrentUser()])
      .then(([elementsResult, userResult]) => {
        if (elementsResult?.error || userResult?.error) {
          throw new Error(elementsResult?.error || userResult?.error);
        }
        this.setState((prevState) => {
          const newState = {};
          newState.elements = (elementsResult?.klass?.length > 0)
            ? elementsResult.klass.filter((k) => k.is_generic)
            : [];
          if (userResult?.user) {
            newState.currentUser = userResult.user;
          }
          return { ...prevState, ...newState };
        });
      })
      .catch((errorMessage) => {
        notification({
          title: 'Error Loading Data',
          lvl: 'error',
          msg: `Failed to load initial data. Please refresh the page. ${errorMessage}`,
        });
      })
      .finally(() => {
        LoadingActions.stop();
      });
  }

  handleShowState(att, val, cb = () => {}) {
    this.setState({ show: this.getShowState(att, val) }, cb);
  }

  handleCreateKlass(_response) {
    const { element, notify } = _response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    element.is_generic = true;
    LoadingActions.start();
    GenericElsFetcher.createElementKlass(element)
      .then((result) => {
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
      .catch((errorMessage) => {
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
    LoadingActions.start();
    GenericElsFetcher.updateElementKlass(inputs)
      .then((result) => {
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
      .catch((errorMessage) => {
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
      .then((result) => {
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
    // eslint-disable-next-line no-restricted-globals, no-alert
    const confirmed = confirm('Are you sure you want to delete this record?');
    if (confirmed) {
      GenericElsFetcher.deleteKlass({
        id: element.id,
        klass: 'ElementKlass',
      })
        .then((result) => {
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

  getShowState(att, val) {
    const { show } = this.state;
    return { ...show, [att]: val };
  }

  closeModal(cb = () => {}) {
    this.handleShowState('modal', '', cb);
  }

  // eslint-disable-next-line class-methods-use-this, react/sort-comp
  handleDownloadKlass(e) {
    LoadingActions.start();
    GenericKlassFetcher.downloadKlass(e.id, 'ElementKlass')
      // eslint-disable-next-line no-unused-vars
      .then((result) => {
        LoadingActions.stop();
      })
      .finally(() => {
        LoadingActions.stop();
      });
  }

  handleUploadKlass(_response) {
    const { element, notify } = _response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    LoadingActions.start();
    GenericElsFetcher.uploadKlass(element)
      .then((result) => {
        if (result?.status === 'success') {
          this.fetchElements();
        }
        notification({
          title: 'Upload Element',
          lvl: result?.status || 'error',
          msg: result?.message || 'Unknown error',
        });
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  }

  fetchRevisions(_element) {
    const element = _element;
    if (element?.id) {
      GenericElsFetcher.fetchKlassRevisions(element.id, 'ElementKlass').then(
        (result) => {
          // eslint-disable-next-line prefer-object-spread
          let curr = Object.assign({}, { ...element.properties_template });
          // eslint-disable-next-line prefer-object-spread
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
      id,
      klass_id: data?.id,
      klass: 'ElementKlass',
    })
      .then((response) => {
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
    LoadingActions.start();
    GenericElsFetcher.fetchElementKlasses()
      .then((result) => {
        if (
          typeof result !== 'undefined' &&
          typeof result.klass !== 'undefined' &&
          result?.klass?.length > 0
        ) {
          this.setState(
            { elements: result.klass.filter((k) => k.is_generic) },
            () => LoadingActions.stop()
          );
        }
      })
      .finally(() => {
        LoadingActions.stop();
      });
  }

  async handleSubmit(_element, _release = "draft") {
    const [element, release] = [_element, _release];
    element.release = release;
    LoadingActions.start();
    const result = await submit(GenericElsFetcher, {
      update: Constants.GENERIC_TYPES.ELEMENT,
      element,
      release,
    });
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
    const { elements = [], revisions, currentUser } = this.state;
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
        fnUpload={this.handleUploadKlass}
        fnDownload={this.handleDownloadKlass}
        fnRefresh={this.fetchElements}
        preview={{
          fnDelRevisions: this.delRevision,
          fnRevisions: this.fetchRevisions,
          revisions,
        }}
        genericType={Constants.GENERIC_TYPES.ELEMENT}
        gridData={els || []}
        refSource={{ currentUser }}
      />
    );
  }

  render() {
    const { currentUser } = this.state;
    if (!currentUser.generic_admin?.elements) {
      return <Unauthorized userName={currentUser.name} text={FN_ID} />;
    }

    return (
      <div className="vw-90 my-auto mx-auto">
        <GenericMenu userName={currentUser.name} text={FN_ID} />
        <div className="mt-3">
          {this.renderGrid()}
        </div>
        <Notifications />
        <LoadingModal />
      </div>
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById(`${FN_ID}Admin`);
  if (domElement) {
    ReactDOM.render(
      <DndProvider backend={HTML5Backend}>
        <GenericElementsAdmin />
      </DndProvider>,
      domElement
    );
  }
});
