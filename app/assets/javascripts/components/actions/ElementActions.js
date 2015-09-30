import alt from '../alt';
import SamplesFetcher from '../fetchers/SamplesFetcher';
import MoleculesFetcher from '../fetchers/MoleculesFetcher';
import ReactionsFetcher from '../fetchers/ReactionsFetcher';
import WellplatesFetcher from '../fetchers/WellplatesFetcher';
import LiteraturesFetcher from '../fetchers/LiteraturesFetcher';
import CollectionsFetcher from '../fetchers/CollectionsFetcher';
import ReactionSvgFetcher from '../fetchers/ReactionSvgFetcher';
import UIActions from '../actions/UIActions';

class ElementActions {

  fetchSampleById(id) {
    SamplesFetcher.fetchById(id)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchSamplesByCollectionId(id, queryParams={}) {
    SamplesFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  createSample(paramObj) {
    delete paramObj['id'];

    SamplesFetcher.create(paramObj)
      .then((result) => {
        this.dispatch(result.sample.id)
      });
  }

  updateSample(paramObj) {
    // delete possible null values for scoped update
    for(var key in paramObj) {
      if(paramObj[key] == null) {
        delete paramObj[key];
      }
    }

    console.log(paramObj)

    SamplesFetcher.update(paramObj)
      .then((result) => {
        this.dispatch(paramObj.id)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchReactionsByCollectionId(id, queryParams={}) {
    ReactionsFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchReactionById(id) {
    ReactionsFetcher.fetchById(id)
      .then((result) => {
        this.dispatch(result.reaction);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchWellplatesByCollectionId(id, queryParams={}) {
    WellplatesFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchWellplateById(id) {
    WellplatesFetcher.fetchById(id)
      .then((result) => {
        this.dispatch(result.wellplate);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  createReactionLiterature(paramObj) {
    LiteraturesFetcher.create(paramObj)
      .then((result) => {
        this.dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  deleteReactionLiterature(literature) {
    LiteraturesFetcher.delete(literature)
      .then((result) => {
        this.dispatch(result.reaction_id)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchLiteraturesByReactionId(id) {
    LiteraturesFetcher.fetchByReactionId(id)
      .then((result) => {
        console.log("Action Fetch Literatures: ");
        console.log(result);
        this.dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  refreshElements(type) {
    this.dispatch(type)
  }

  generateEmptySample() {
    let sample = {
      id: '_new_',
      type: 'sample',
      name: 'New Sample',
      amount_value: 0,
      amount_unit: 'g',
      description: '',
      purity: 0,
      solvent: '',
      impurities: '',
      location: '',
      molfile: '',
      molecule: {}
    }
    this.dispatch(sample)
  }

  fetchMoleculeByMolfile(molfile) {
    MoleculesFetcher.fetchByMolfile(molfile)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchReactionSvgByMaterialsInchikeys(materialsInchikeys){
    ReactionSvgFetcher.fetchByMaterialsInchikeys(materialsInchikeys)
      .then((result) => {
        this.dispatch(result.reaction_svg);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchReactionSvgByReactionId(reaction_id){
    ReactionSvgFetcher.fetchByReactionId(reaction_id)
      .then((result) => {
        this.dispatch(result.reaction_svg);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  deleteElements(ui_state) {
    this.dispatch(ui_state);
    UIActions.uncheckAllElements('sample');
    UIActions.uncheckAllElements('reaction');
    UIActions.uncheckAllElements('wellplate');
  }

  deleteSamplesByUIState(ui_state) {
    SamplesFetcher.deleteSamplesByUIState(ui_state)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  deleteReactionsByUIState(ui_state) {
    ReactionsFetcher.deleteReactionsByUIState(ui_state)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  deleteWellplatesByUIState(ui_state) {
    WellplatesFetcher.deleteWellplatesByUIState(ui_state)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateElementsCollection(paramObj) {
    CollectionsFetcher.updateElementsCollection(paramObj)
      .then(() => {
        this.dispatch(paramObj);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  assignElementsCollection(paramObj) {
    CollectionsFetcher.assignElementsCollection(paramObj)
      .then(() => {
        this.dispatch(paramObj);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  removeElementsCollection(paramObj) {
    CollectionsFetcher.removeElementsCollection(paramObj)
      .then(() => {
        this.dispatch(paramObj);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  splitAsSubsamples(ui_state) {
    SamplesFetcher.splitAsSubsamples(ui_state)
      .then((result) => {
        this.dispatch(ui_state);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

}

export default alt.createActions(ElementActions);
