/* eslint-disable prefer-object-spread */
import React from 'react';
import ReactDOM from 'react-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { orderBy } from 'lodash';
import { Constants, Designer } from 'chem-generic-ui';
import LoadingModal from 'src/components/common/LoadingModal';
import Notifications from 'src/components/Notifications';
import GenericDSsFetcher from 'src/fetchers/GenericDSsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { GenericMenu, Unauthorized } from 'src/apps/generic/GenericUtils';
import { notification, submit } from 'src/apps/generic/Utils';

const FN_ID = 'GenericDatasets';

export default class GenericDatasetsAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      show: { tab: '', modal: '' },
      revisions: [],
      user: {},
    };
    this.handleShowState = this.handleShowState.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.handleActivateKlass = this.handleActivateKlass.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.delRevision = this.delRevision.bind(this);
    this.fetchRevisions = this.fetchRevisions.bind(this);
    this.fetchElements = this.fetchElements.bind(this);
  }

  componentDidMount() {
    this.fetchElements();
    UsersFetcher.fetchCurrentUser()
      .then((result) => {
        if (!result.error) {
          this.setState({ user: result.user });
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleActivateKlass(e) {
    const act = e.is_active ? 'De-activate' : 'Activate';
    GenericDSsFetcher.deActivateKlass({
      id: e.id,
      is_active: !e.is_active,
      klass: 'DatasetKlass',
    })
      .then((result) => {
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
      .catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  handleShowState(att, val, cb = () => {}) {
    this.setState({ show: this.getShowState(att, val) }, cb);
  }

  async handleSubmit(_element, _release = 'draft') {
    const [element, release] = [_element, _release];
    element.release = release;
    LoadingActions.start();
    const result = await submit(GenericDSsFetcher, { update: Constants.GENERIC_TYPES.DATASET, element, release });
    if (result.isSuccess) {
      notification(result);
      this.fetchElements();
      // eslint-disable-next-line react/no-unused-state
      this.setState({ element: result.response }, () => LoadingActions.stop());
    } else {
      notification(result);
    }
    LoadingActions.stop();
  }

  getShowState(att, val) {
    const { show } = this.state;
    return { ...show, [att]: val };
  }

  fetchElements() {
    LoadingActions.start();
    GenericDSsFetcher.listDatasetKlass().then((result) => {
      this.setState({ elements: result.klass });
    }).finally(() => {
      LoadingActions.stop();
    });
  }

  closeModal(cb = () => {}) {
    this.handleShowState('modal', '', cb);
  }

  fetchRevisions(_element) {
    const element = _element;
    if (element?.id) {
      GenericDSsFetcher.fetchKlassRevisions(element.id, 'DatasetKlass').then(
        (result) => {
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
      id,
      klass_id: data?.id,
      klass: 'DatasetKlass',
    }).then((response) => {
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

  renderGrid() {
    const { elements, revisions } = this.state;
    const els = orderBy(elements, ['is_active', 'label'], ['desc', 'asc']);
    return (
      <Designer
        fnCopy={() => {}}
        fnCreate={() => {}}
        fnSubmit={this.handleSubmit}
        fnActive={this.handleActivateKlass}
        fnDerive={() => {}}
        fnUpdate={() => {}}
        fnRefresh={this.fetchElements}
        preview={{
          fnDelRevisions: this.delRevision,
          fnRevisions: this.fetchRevisions,
          revisions,
        }}
        genericType={Constants.GENERIC_TYPES.DATASET}
        gridData={els}
      />
    );
  }

  render() {
    const { user } = this.state;
    if (!user.generic_admin?.datasets) {
      return <Unauthorized userName={user.name} text={FN_ID} />;
    }

    return (
      <div className="vw-90 my-auto mx-auto">
        <GenericMenu userName={user.name} text={FN_ID} />
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
        <GenericDatasetsAdmin />
      </DndProvider>,
      domElement
    );
  }
});
