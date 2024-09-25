/* eslint-disable class-methods-use-this */
import GenericDSsFetcher from 'src/fetchers/GenericDSsFetcher';
import GenericSgsFetcher from 'src/fetchers/GenericSgsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import alt from 'src/stores/alt/alt';
import DocumentHelper from 'src/utilities/DocumentHelper';
const template_list = [
  { "struct": "{\n    \"root\": {\n        \"nodes\": [\n            {\n                \"$ref\": \"mol0\"\n            },\n            {\n                \"type\": \"image\",\n                \"format\": \"image/svg+xml\",\n                \"boundingBox\": {\n                    \"x\": 11.65,\n                    \"y\": -16.6,\n                    \"z\": 0,\n                    \"width\": 1.0749999999999993,\n                    \"height\": 1.0250000000000004\n                },\n                \"data\": \"PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciICB2aWV3Qm94PSIwIDAgMTYwIDE2MCI+CiAgPGNpcmNsZSByPSI3NSIgY3g9IjgwIiBjeT0iODAiIHN0cm9rZT0iI2FjNWIyMyIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSIjZWQ3ZDMxIiAvPgo8L3N2Zz4=\"\n            }\n        ],\n        \"connections\": [],\n        \"templates\": []\n    },\n    \"header\": {\n        \"moleculeName\": \"Round-Mono\"\n    },\n    \"mol0\": {\n        \"type\": \"molecule\",\n        \"atoms\": [\n            {\n                \"label\": \"A\",\n                \"alias\": \"t_02\",\n                \"location\": [\n                    12.174999999999999,\n                    -17.099999999999998,\n                    0\n                ]\n            },\n            {\n                \"label\": \"H\",\n                \"location\": [\n                    13.174999999999999,\n                    -17.099999999999998,\n                    0\n                ]\n            }\n        ],\n        \"bonds\": [\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    0,\n                    1\n                ]\n            }\n        ],\n        \"sgroups\": [\n            {\n                \"type\": \"SUP\",\n                \"atoms\": [\n                    0,\n                    1\n                ],\n                \"name\": \"\",\n                \"expanded\": true,\n                \"id\": 0,\n                \"attachmentPoints\": [\n                    {\n                        \"attachmentAtom\": 0,\n                        \"leavingAtom\": 1,\n                        \"attachmentId\": \"1\"\n                    }\n                ]\n            }\n        ],\n        \"stereoFlagPosition\": {\n            \"x\": 12.174999999999999,\n            \"y\": 16.099999999999998,\n            \"z\": 0\n        }\n    }\n}", "props": { "atomid": 0, "bondid": 0 } }
];
class UserActions {
  fetchOlsRxno() {
    return (dispatch) => {
      UsersFetcher.fetchOls('rxno')
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchOlsChmo() {
    return (dispatch) => {
      UsersFetcher.fetchOls('chmo')
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchOlsBao() {
    return (dispatch) => {
      UsersFetcher.fetchOls('bao')
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchCurrentUser() {
    return (dispatch) => {
      UsersFetcher.fetchCurrentUser()
        .then((result) => {
          dispatch(result.user);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchGenericEls() {
    return (dispatch) => {
      UsersFetcher.fetchElementKlasses()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  logout() {
    fetch('/users/sign_out', {
      method: 'delete',
      credentials: 'same-origin',
      data: { authenticity_token: DocumentHelper.getMetaContent('csrf-token') }
    })
      .then(response => {
        if (response.status == 204) {
          location = '/home';
        }
      });
  }

  fetchProfile() {
    return (dispatch) => {
      UsersFetcher.fetchProfile()
        .then((result) => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  setUsertemplates() {
    const storageKey = 'ketcher-tmpls';
    UsersFetcher.fetchProfile().then((res) => {
      if (res?.user_templates) {
        localStorage.setItem(storageKey, '');
        res.user_templates.push(...template_list);
        localStorage.setItem(storageKey, JSON.stringify(res.user_templates));
      }
    });
  }

  selectTab(tab) {
    return tab;
  }

  updateUserProfile(params) {
    return (dispatch) => {
      UsersFetcher.updateUserProfile(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchUserLabels() {
    return (dispatch) => {
      UsersFetcher.listUserLabels(true)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchEditors() {
    return (dispatch) => {
      UsersFetcher.listEditors()
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchNoVNCDevices() {
    return (dispatch) => {
      UsersFetcher.fetchNoVNCDevices()
        .then(result => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  fetchSegmentKlasses() {
    return (dispatch) => {
      GenericSgsFetcher.listSegmentKlass()
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchDatasetKlasses() {
    return (dispatch) => {
      GenericDSsFetcher.fetchKlass()
        .then((result) => {
          dispatch(result);
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchUnitsSystem() {
    return (dispatch) => {
      fetch('/units_system/units_system.json', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'cache-control': 'no-cache' }
      }).then(response => response.json()).then(json => dispatch(json)).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  fetchOmniauthProviders() {
    return (dispatch) => {
      UsersFetcher.fetchOmniauthProviders()
        .then((result) => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  fetchKetcher2Options() {
    return () => {
      UsersFetcher.fetchUserKetcher2Options()
        .then((result) => {
          if (result && result?.settings) {
            if (Object.keys(result?.settings).length) {
              localStorage.setItem('ketcher-opts', JSON.stringify(result.settings));
            }
          }
        })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }
}

export default alt.createActions(UserActions);
