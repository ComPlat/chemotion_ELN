import React, { useContext, useEffect, useState } from 'react';
import { orderBy } from 'lodash';
import { Constants, Designer } from 'chem-generic-ui';
import LoadingModal from 'src/components/common/LoadingModal';
import Notifications from 'src/components/Notifications';
import GenericSgsFetcher from 'src/fetchers/GenericSgsFetcher';
import GenericKlassFetcher from 'src/fetchers/GenericKlassFetcher';
import LoadingActions from 'src/stores/alt/actions/LoadingActions';
import { GenericMenu, Unauthorized } from 'src/apps/generic/GenericUtils';
import { notification, submit } from 'src/apps/generic/Utils';
import { StoreContext } from 'src/stores/mobx/RootStore';
import { observer } from 'mobx-react';

const FN_ID = 'GenericSegments';

const GenericSegmentsAdmin = () => {
  const { userStore } = useContext(StoreContext);
  const { currentUser, segmentKlasses } = userStore;

  const [show, setShow] = useState({ tab: '', modal: '' });
  const [revisions, setRevisions] = useState([]);

  useEffect(() => {
    LoadingActions.start();

    if (!currentUser) {
      userStore.fetchCurrentUser();
    }

    userStore.fetchGenericElKlasses();

    if (segmentKlasses.length < 1) {
      userStore.fetchSegmentKlasses();
    }
    LoadingActions.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSegmentKlasses = () => {
    LoadingActions.start();
    userStore.fetchSegmentKlasses();
    LoadingActions.stop();
  };

  const getShowState = (att, val) => ({ ...show, [att]: val });

  const handleShowState = (att, val, cb = () => {}) => {
    setShow(getShowState(att, val));
    cb;
  };

  const handleCreateKlass = (response) => {
    const { element, notify } = response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    GenericSgsFetcher.createKlass(element)
      .then((result) => {
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
          fetchSegmentKlasses();
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleUpdateKlass = (response) => {
    const { element, notify } = response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    GenericSgsFetcher.updateSegmentKlass(element)
      .then((result) => {
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
          fetchSegmentKlasses();
        }
      })
      .catch((errorMessage) => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const fetchRevisions = (element) => {
    if (element?.id) {
      LoadingActions.start();
      GenericSgsFetcher.fetchKlassRevisions(element.id, 'SegmentKlass')
        .then((result) => {
          // eslint-disable-next-line prefer-object-spread
          let curr = Object.assign({}, { ...element.properties_template });
          // eslint-disable-next-line prefer-object-spread
          curr = Object.assign(
            {},
            { properties_release: curr },
            { uuid: 'current' }
          );
          setRevisions([].concat(curr, result.revisions));
        })
        .finally(() => {
          LoadingActions.stop();
        });
    }
  };

  const delRevision = (params) => {
    const { id, data, uuid } = params;
    LoadingActions.start();
    GenericSgsFetcher.deleteKlassRevision({
      id,
      klass_id: data?.id,
      klass: 'SegmentKlass',
    })
      .then((response) => {
        if (response.error) {
          notification({
            title: 'Delete Revision',
            lvl: 'error',
            msg: response.error,
          });
        } else {
          fetchRevisions(data);
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
  };

  const handleActivateKlass = (e) => {
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
          fetchSegmentKlasses();
        }
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleDeleteKlass = (element) => {
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
            fetchSegmentKlasses();
            handleShowState('tab', '');
          }
        })
        .finally(() => {
          LoadingActions.stop();
        });
    }
  };

  const handleDownloadKlass = (e) => {
    LoadingActions.start();
    GenericKlassFetcher.downloadKlass(e.id, 'SegmentKlass')
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleUploadKlass = (response) => {
    const { element, notify } = response;
    if (!notify.isSuccess) {
      notification(notify);
      return;
    }
    LoadingActions.start();
    GenericSgsFetcher.uploadKlass(element)
      .then(result => {
        if (result?.status === 'success') {
          fetchSegmentKlasses();
        }
        notification({
          title: 'Upload Segment',
          lvl: result?.status || 'error',
          msg: result?.message || 'Unknown error',
        });
      })
      .catch(errorMessage => {
        console.log(errorMessage);
      })
      .finally(() => {
        LoadingActions.stop();
      });
  };

  const handleSubmit = async(element, release = 'draft') => {
    element.release = release;
    LoadingActions.start();
    const result = await submit(GenericSgsFetcher, { update: Constants.GENERIC_TYPES.SEGMENT, element, release });
    if (result.isSuccess) {
      notification(result);
      fetchSegmentKlasses();
    } else {
      notification(result);
    }
    LoadingActions.stop();
  };

  const renderGrid = () => {
    const elements = orderBy(segmentKlasses, ['is_active', 'label'], ['desc', 'asc']);

    return (
      <Designer
        fnCopy={handleCreateKlass}
        fnCreate={handleCreateKlass}
        fnSubmit={handleSubmit}
        fnActive={handleActivateKlass}
        fnDelete={handleDeleteKlass}
        fnUpdate={handleUpdateKlass}
        fnUpload={handleUploadKlass}
        fnDownload={handleDownloadKlass}
        fnRefresh={fetchSegmentKlasses}
        genericType={Constants.GENERIC_TYPES.SEGMENT}
        gridData={elements}
        klasses={userStore.genericElementKlassesArray('segmentAdmin')}
        preview={{
          fnDelRevisions: delRevision,
          fnRevisions: fetchRevisions,
          revisions,
        }}
        refSource={{ currentUser }}
      />
    );
  };

  if (currentUser && !currentUser.generic_admin?.segments) {
    return <Unauthorized userName={currentUser.name} text={FN_ID} />;
  }
  return (
    <div className="vw-90 my-auto mx-auto">
      <GenericMenu userName={currentUser?.name} text={FN_ID} />
      <div className="mt-3">
        {renderGrid()}
      </div>
      <Notifications />
      <LoadingModal />
    </div>
  );
};

export default observer(GenericSegmentsAdmin);
