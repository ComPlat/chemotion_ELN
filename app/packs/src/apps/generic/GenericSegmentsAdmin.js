import React from 'react';
import ReactDOM from 'react-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { orderBy } from 'lodash';
import { Constants, Designer } from 'chem-generic-ui';
import SyncBtn from 'src/apps/generic/SyncButton';
import LoadingModal from 'src/components/common/LoadingModal';
import Notifications from 'src/components/Notifications';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import GenericSgsFetcher from 'src/fetchers/GenericSgsFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { notification, submit } from 'src/apps/generic/Utils';
import {
  GenericAdminNav,
  GenericAdminUnauth,
} from 'src/apps/generic/GenericAdminNav';

const validateInput = element => {
  if (element.klass_element === '') {
    notification({
      title: 'Create Segment Error',
      lvl: 'error',
      msg: 'Please select Element.',
    });
    return false;
  }
  if (element.label === '') {
    notification({
      title: 'Create Segment Error',
      lvl: 'error',
      msg: 'Please input Segment Label.',
    });
    return false;
  }
  return true;
};

export default class GenericSegmentsAdmin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      elements: [],
      klasses: [],
      show: { tab: '', modal: '' },
      propTabKey: 1,
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
    this.fetchElementKlasses = this.fetchElementKlasses.bind(this);
  }

  componentDidMount() {
    this.fetchElements();
    this.fetchElementKlasses();
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

  fetchRevisions(_element) {
    const element = _element;
    if (element?.id) {
      LoadingActions.start();
      GenericSgsFetcher.fetchKlassRevisions(element.id, 'SegmentKlass')
        .then(result => {
          let curr = Object.assign({}, { ...element.properties_template });
          curr = Object.assign(
            {},
            { properties_release: curr },
            { uuid: 'current' }
          );
          const revisions = [].concat(curr, result.revisions);
          this.setState({ revisions });
        })
        .finally(() => {
          LoadingActions.stop();
        });
    }
  }

  delRevision(params) {
    const { id, data, uuid } = params;
    LoadingActions.start();
    GenericSgsFetcher.deleteKlassRevision({
      id: id,
      klass_id: data?.id,
      klass: 'SegmentKlass',
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

  handleShowState(att, val, cb = () => {}) {
    this.setState({ show: this.getShowState(att, val) }, cb);
  }
  closeModal(cb = () => {}) {
    this.handleShowState('modal', '', cb);
  }

  handleShowRepo() {
    LoadingActions.start();
    GenericSgsFetcher.fetchRepo().then(result => {
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
    GenericSgsFetcher.createRepo({ identifier: element['identifier'] }).then(
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
    this.closeModal(this.fetchElements);
  }

  handleCreateKlass(_response) {
    const { element, notify } = _response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    if (!validateInput(element)) return;
    GenericSgsFetcher.createKlass(element)
      .then(result => {
        if (result.error) {
          notification({
            title: 'Create Segment fail',
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: 'Create Segment successfully',
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
    if (!validateInput(inputs)) return;
    GenericSgsFetcher.updateSegmentKlass(inputs)
      .then(result => {
        if (result.error) {
          notification({
            title: 'Update Segment fail',
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: 'Update Segment successfully',
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
    GenericSgsFetcher.deActivateKlass({
      id: e.id,
      is_active: !e.is_active,
      klass: 'SegmentKlass',
    })
      .then(result => {
        if (result.error) {
          notification({
            title: `${act} Segment fail`,
            lvl: 'error',
            msg: result.error,
          });
        } else {
          notification({
            title: `${act} Segment successfully`,
            lvl: 'info',
            msg: `Segment is ${act.toLowerCase()} now`,
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

  handleDeleteKlass(element) {
    if (element.is_active) {
      notification({
        title: 'Delete Segment fail',
        lvl: 'error',
        msg: `You cannot delete an active segment [${element.label}]. Please make it [inactive] first.`,
      });
      return;
    }
    const confirmed = confirm('Are you sure you want to delete this record?');
    if (confirmed) {
      GenericSgsFetcher.deleteKlass({
        id: element.id,
        klass: 'SegmentKlass',
      })
        .then(result => {
          if (result.error) {
            notification({
              title: 'Delete Segment fail',
              lvl: 'error',
              msg: result.error,
            });
          } else {
            notification({
              title: `Segment [${element.label}]`,
              lvl: 'info',
              msg: 'Deleted successfully',
            });
            this.fetchElements();
            this.handleShowState('tab', '');
          }
        })
        .finally(() => {
          LoadingActions.stop();
        });
    }
  }

  fetchElements() {
    GenericSgsFetcher.listSegmentKlass().then(result => {
      this.setState({ elements: result.klass }, () => LoadingActions.stop());
    });
  }

  fetchElementKlasses() {
    GenericElsFetcher.fetchElementKlasses().then(result => {
      const klasses = result?.klass?.sort((a, b) => a.place - b.place) || [];
      this.setState({ klasses });
    });
  }

  async handleSubmit(_element, _release = 'draft') {
    const [element, release] = [_element, _release];
    element.release = release;
    LoadingActions.start();
    const result = await submit(GenericSgsFetcher, { update: Constants.GENERIC_TYPES.SEGMENT, element, release });
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
        fnCopy={this.handleCreateKlass}
        fnCreate={this.handleCreateKlass}
        fnSubmit={this.handleSubmit}
        fnActive={this.handleActivateKlass}
        fnDelete={this.handleDeleteKlass}
        fnUpdate={this.handleUpdateKlass}
        genericType="Segment"
        gridData={els}
        klasses={this.state.klasses}
        preview={{
          fnDelRevisions: this.delRevision,
          fnRevisions: this.fetchRevisions,
          revisions: this.state.revisions,
        }}
      />
    );
  }

  render() {
    const { user } = this.state;
    if (!user.generic_admin?.segments) {
      return <GenericAdminUnauth userName={user.name} text="GenericSegments" />;
    }
    return (
      <div style={{ width: '90vw', margin: 'auto' }}>
        <GenericAdminNav userName={user.name} text="GenericSegments" />
        <hr />
        <div style={{ marginTop: '60px' }}>
          <h3>Generic Segments Designer</h3>
          <SyncBtn
            data={this.state.repoData}
            fnCreate={this.handleCreateRepo}
            fnModalClose={this.closeModal}
            fnModalOpen={this.handleShowRepo}
            genericType={Constants.GENERIC_TYPES.SEGMENT}
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
  const domElement = document.getElementById('GenericSegmentsAdmin');
  if (domElement)
    ReactDOM.render(
      <DndProvider backend={HTML5Backend}>
        <GenericSegmentsAdmin />
      </DndProvider>,
      domElement
    );
});
