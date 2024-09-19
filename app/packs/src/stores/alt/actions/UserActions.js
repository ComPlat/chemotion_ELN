/* eslint-disable class-methods-use-this */
import GenericDSsFetcher from 'src/fetchers/GenericDSsFetcher';
import GenericSgsFetcher from 'src/fetchers/GenericSgsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import alt from 'src/stores/alt/alt';

import DocumentHelper from 'src/utilities/DocumentHelper';

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
        res.user_templates.push(
          {
            "struct": "{\n    \"root\": {\n        \"nodes\": [\n            {\n                \"$ref\": \"mol0\"\n            },\n            {\n                \"$ref\": \"mol1\"\n            }\n        ],\n        \"connections\": [],\n        \"templates\": []\n    },\n    \"header\": {\n        \"moleculeName\": \"greybox\"\n    },\n    \"mol0\": {\n        \"type\": \"molecule\",\n        \"atoms\": [\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    10.20521648774133,\n                    -7.45624858849801,\n                    0\n                ]\n            },\n            {\n                \"label\": \"N\",\n                \"location\": [\n                    11.07131487776401,\n                    -6.956149518124678,\n                    0\n                ],\n                \"charge\": 1\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    11.07131487776401,\n                    -5.956251376820351,\n                    0\n                ]\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    11.937313267972579,\n                    -7.45624858849801,\n                    0\n                ]\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    12.803311658181146,\n                    -6.956149518124678,\n                    0\n                ]\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    12.803311658181146,\n                    -5.956251376820351,\n                    0\n                ]\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    13.669310048389715,\n                    -5.456252306261131,\n                    0\n                ]\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    14.535408438412395,\n                    -5.956251376820351,\n                    0\n                ]\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    14.535408438412395,\n                    -6.956149518124678,\n                    0\n                ]\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    13.669310048389715,\n                    -7.45624858849801,\n                    0\n                ]\n            },\n            {\n                \"label\": \"C\",\n                \"location\": [\n                    10.20521648774133,\n                    -6.456350447193683,\n                    0\n                ]\n            }\n        ],\n        \"bonds\": [\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    0,\n                    1\n                ]\n            },\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    1,\n                    2\n                ]\n            },\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    1,\n                    3\n                ]\n            },\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    3,\n                    4\n                ]\n            },\n            {\n                \"type\": 2,\n                \"atoms\": [\n                    4,\n                    5\n                ]\n            },\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    5,\n                    6\n                ]\n            },\n            {\n                \"type\": 2,\n                \"atoms\": [\n                    6,\n                    7\n                ]\n            },\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    7,\n                    8\n                ]\n            },\n            {\n                \"type\": 2,\n                \"atoms\": [\n                    8,\n                    9\n                ]\n            },\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    4,\n                    9\n                ]\n            },\n            {\n                \"type\": 1,\n                \"atoms\": [\n                    1,\n                    10\n                ]\n            }\n        ],\n        \"stereoFlagPosition\": {\n            \"x\": 14.535408438412395,\n            \"y\": 4.456252306261131,\n            \"z\": 0\n        }\n    },\n    \"mol1\": {\n        \"type\": \"molecule\",\n        \"atoms\": [\n            {\n                \"label\": \"Br\",\n                \"location\": [\n                    11.07131487776401,\n                    -7.9562476590572295,\n                    0\n                ],\n                \"charge\": -1\n            }\n        ],\n        \"stereoFlagPosition\": {\n            \"x\": 11.07131487776401,\n            \"y\": 6.9562476590572295,\n            \"z\": 0\n        }\n    }\n}",
            "props": {
              "atomid": 0,
              "bondid": 0,
              "path": "/home/chemotion-dev/app/uploads/development/user_templates/4/nQIebNcErG.txt"
            }
          }
        );

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
