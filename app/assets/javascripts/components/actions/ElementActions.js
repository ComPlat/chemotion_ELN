import alt from '../alt';
import UIActions from './UIActions';

import SamplesFetcher from '../fetchers/SamplesFetcher';
import MoleculesFetcher from '../fetchers/MoleculesFetcher';
import ReactionsFetcher from '../fetchers/ReactionsFetcher';
import WellplatesFetcher from '../fetchers/WellplatesFetcher';
import CollectionsFetcher from '../fetchers/CollectionsFetcher';
import ReactionSvgFetcher from '../fetchers/ReactionSvgFetcher';
import ScreensFetcher from '../fetchers/ScreensFetcher';
import SearchFetcher from '../fetchers/SearchFetcher';

import Molecule from '../models/Molecule';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';

import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';

import _ from 'lodash';

class ElementActions {

  // -- Search --

  fetchBasedOnSearchSelectionAndCollection(selection, collectionId, currentPage) {
    SearchFetcher.fetchBasedOnSearchSelectionAndCollection(selection, collectionId, currentPage)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  // -- Collections --


  fetchReactionsByCollectionId(id, queryParams={}) {
    ReactionsFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }


  // -- Samples --

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

  createSample(params) {
    SamplesFetcher.create(params)
      .then((result) => {
        this.dispatch(result)
      });
  }

  updateSample(params) {
    let _params = _.omit(params, _.isNull); //should be better done in SampleProxy#serialize

    SamplesFetcher.update(_params)
      .then((result) => {
        this.dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  generateEmptySample(collection_id) {
    this.dispatch(Sample.buildEmpty(collection_id))
  }

  splitAsSubsamples(ui_state) {
    SamplesFetcher.splitAsSubsamples(ui_state)
      .then((result) => {
        this.dispatch(ui_state);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  copySampleFromClipboard(collection_id) {
    this.dispatch(collection_id);
  }

  addSampleToMaterialGroup(params) {
    this.dispatch(params);
  }

  // -- Molecules --

  fetchMoleculeByMolfile(molfile) {
    MoleculesFetcher.fetchByMolfile(molfile)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  // -- Reactions --

  fetchReactionById(id) {
    ReactionsFetcher.fetchById(id)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  createReaction(params) {
    ReactionsFetcher.create(params)
      .then((result) => {
        this.dispatch(result)
      });
  }

  updateReaction(params) {
    ReactionsFetcher.update(params)
      .then((result) => {
        this.dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  generateEmptyReaction(collection_id) {
    this.dispatch(Reaction.buildEmpty(collection_id))
  }

  copyReactionFromId(id) {
    ReactionsFetcher.fetchById(id)
    .then((result) => {
      this.dispatch(result);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });
  }

  openReactionDetails(reaction) {
    this.dispatch(reaction);
  }

  // -- Reactions SVGs --

  fetchReactionSvgByMaterialsInchikeys(materialsInchikeys, label){
    ReactionSvgFetcher.fetchByMaterialsInchikeys(materialsInchikeys, label)
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


  // -- Wellplates --

  generateWellplateFromClipboard(collection_id) {
    this.dispatch(collection_id);
  }

  generateEmptyWellplate(collection_id) {
    this.dispatch(Wellplate.buildEmpty(collection_id));
  }

  createWellplate(wellplate) {
    WellplatesFetcher.create(wellplate)
      .then(result => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateWellplate(wellplate) {
    WellplatesFetcher.update(wellplate)
      .then(result => {
        this.dispatch(result);
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
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }


  // -- Screens --

  generateScreenFromClipboard(collection_id) {
    this.dispatch(collection_id);
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
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  generateEmptyScreen(collection_id) {
    this.dispatch(Screen.buildEmpty(collection_id));
  }

  createScreen(screen) {
    ScreensFetcher.create(screen)
      .then(result => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateScreen(screen) {
    ScreensFetcher.update(screen)
      .then(result => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  // -- General --

  refreshElements(type) {
    this.dispatch(type)
  }


  deleteElements(options) {
    this.dispatch(options);
    UIActions.uncheckWholeSelection();
  }

  removeElements() {
    this.dispatch();
  }

  // - ...

  deleteSamplesByUIState(ui_state) {
    SamplesFetcher.deleteSamplesByUIState(ui_state)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  deleteReactionsByUIState(params) {
    ReactionsFetcher.deleteReactionsByUIState(params)
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

  updateElementsCollection(params) {
    CollectionsFetcher.updateElementsCollection(params)
      .then(() => {
        this.dispatch(params);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    UIActions.uncheckWholeSelection();
  }

  assignElementsCollection(params) {
    CollectionsFetcher.assignElementsCollection(params)
      .then(() => {
        this.dispatch(params);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    UIActions.uncheckWholeSelection();
  }

  removeElementsCollection(params) {
    CollectionsFetcher.removeElementsCollection(params)
      .then(() => {
        this.dispatch(params);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    UIActions.uncheckWholeSelection();
  }

}

export default alt.createActions(ElementActions);
