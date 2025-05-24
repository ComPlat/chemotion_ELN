// import 'whatwg-fetch';

// import NotificationActions from '../actions/NotificationActions';

// export default class ForwardFetcher {
//   static fetchforward(reactants, reagents, solvent, num_res) {

//     console.log(reactants);
//     const promise = fetch(`/api/v1/prediction/products?reactants=COOC&reagents=COO&solvent=O&num_results=2`,
//     // const promise = fetch(`https://172.21.39.236/api/forward/getProducts/?reactants=COOC&reagents=COO&solvent=O&num_results=2`,
//      {
//       credentials: 'same-origin',
//       method: 'GET',
//     }).then((response) => {
//       return response.json();
//     }).then((json) => {
//       if (json.error) {
//         NotificationActions.add.defer({
//           message: json.error,
//           level: 'error'
//         });
//       } else {
//         NotificationActions.add.defer({
//           message: 'Prediction Success!',
//           level: 'success'
//         });
//       }
//       return json;
//     }).catch((errorMessage) => {
//       console.log(errorMessage);
//     });

//     return promise;
//   }
// }

import 'whatwg-fetch';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
export default class ForwardFetcher {



  static fetchforward(params) {
    // const path = template === 'predictProducts' ? 'products' : 'retro' ;

    const promise = fetch(`/api/v1/prediction/products`,{
      credentials: 'same-origin',
      method: 'post',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params),
    }).then((response) => {
      return response.json();
    }).then((json) => {
      if (json.error) {
        NotificationActions.add.defer({
          message: json.error,
          level: 'error'
        });
      } else {
        NotificationActions.add.defer({
          message: 'Prediction Success!',
          level: 'success'
        });
      }
      
      return json;
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });

    return promise;
  }
}

