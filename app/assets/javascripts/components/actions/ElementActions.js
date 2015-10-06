import alt from '../alt';
import SamplesFetcher from '../fetchers/SamplesFetcher';
import MoleculesFetcher from '../fetchers/MoleculesFetcher';
import ReactionsFetcher from '../fetchers/ReactionsFetcher';
import WellplatesFetcher from '../fetchers/WellplatesFetcher';
import LiteraturesFetcher from '../fetchers/LiteraturesFetcher';
import CollectionsFetcher from '../fetchers/CollectionsFetcher';
import ReactionSvgFetcher from '../fetchers/ReactionSvgFetcher';
import UIActions from '../actions/UIActions';
import ScreensFetcher from '../fetchers/ScreensFetcher';
import SearchFetcher from '../fetchers/SearchFetcher';

import Molecule from '../models/Molecule';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';

class ElementActions {

  fetchBasedOnSearchSelectionAndCollection(selection, collectionId) {
    SearchFetcher.fetchBasedOnSearchSelectionAndCollection(selection, collectionId)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

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
        this.dispatch(result.sample)
      });
  }

  updateSample(paramObj) {
    // delete possible null values for scoped update
    for(var key in paramObj) {
      if(paramObj[key] == null) {
        delete paramObj[key];
      }
    }

    SamplesFetcher.update(paramObj)
      .then((result) => {
        this.dispatch(paramObj)
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
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  generateEmptyWellplate() {
    const wellplate = {
      id: '_new_',
      type: 'wellplate',
      name: 'New Wellplate',
      size: 96,
      description: '',
      wells: []
    };
    this.dispatch(wellplate);
  }

  createWellplate(wellplate) {
    delete wellplate.id;

    WellplatesFetcher.create(wellplate)
      .then(result => {
        this.dispatch(result.wellplate);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateWellplate(wellplate) {
    WellplatesFetcher.update(wellplate)
      .then(result => {
        this.dispatch(result.wellplate);
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

  fetchScreensByCollectionId(id, queryParams={}) {
    ScreensFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchScreenById(id) {
    ScreensFetcher.fetchById(id)
      .then((result) => {
        this.dispatch(result.screen);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  generateEmptyScreen() {
    const screen = {
      id: '_new_',
      type: 'screen',
      name: 'New Screen',
      collaborator: '',
      requirements: '',
      conditions: '',
      result: '',
      description: '',
      wellplates: []
    };
    this.dispatch(screen);
  }

  createScreen(screen) {
    const {wellplates} = screen;
    delete screen.wellplates;
    delete screen.id;
    screen.wellplate_ids = wellplates.map(wellplate => wellplate.id );

    ScreensFetcher.create(screen)
      .then(result => {
        this.dispatch(result.screen);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateScreen(screen) {
    const {wellplates} = screen;
    delete screen.wellplates;
    screen.wellplate_ids = wellplates.map(wellplate => wellplate.id );

    ScreensFetcher.update(screen)
      .then(result => {
        this.dispatch(result.screen);
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
    let sample = new Sample({
      id: '_new_',
      type: 'sample',
      name: 'New Sample',
      external_label: '',
      amount_value: 0,
      amount_unit: 'g',
      description: '',
      purity: 0,
      solvent: '',
      impurities: '',
      location: '',
      molfile: '',
      molecule: {}
    })
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
    //UIActions.uncheckAllElements('sample');
    //UIActions.uncheckAllElements('reaction');
    //UIActions.uncheckAllElements('wellplate');
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

  deleteScreensByUIState(ui_state) {
    ScreensFetcher.deleteScreensByUIState(ui_state)
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
