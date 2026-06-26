import ApiClient from 'src/api_clients/ChemotionApiClient';
import { Map } from 'immutable';

import Reaction from 'src/models/Reaction';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import AnnotationsFetcher from 'src/fetchers/AnnotationsFetcher';
import Literature from 'src/models/Literature';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';
import GasPhaseReactionActions from 'src/stores/alt/actions/GasPhaseReactionActions';
import WeightPercentageReactionActions from 'src/stores/alt/actions/WeightPercentageReactionActions';
import { preparedCollectionParams } from 'src/utilities/FetcherHelper';

export default class ReactionsFetcher {
  static fetchByCollectionId(id, params = {}) {
    const sortParams = this.reactionSortParams();
    const updatedParams = { ...params, ...sortParams };

    return ApiClient.getJson(`/api/v1/reactions?${preparedCollectionParams(id, updatedParams)}`, {
      handleResponseSuccess: (response) => response.json()
        .then((json) => ({
          elements: json.reactions.map((reaction) => (new Reaction(reaction))),
          totalElements: parseInt(response.headers.get('X-Total'), 10),
          page: parseInt(response.headers.get('X-Page'), 10),
          pages: parseInt(response.headers.get('X-Total-Pages'), 10),
          perPage: parseInt(response.headers.get('X-Per-Page'), 10)
        })),
    });
  }

  static reactionSortParams() {
    const userState = UserStore.getState();
    const filters = userState?.profile?.data?.filters || {};
    if (!filters.reaction) return { sort_column: 'created_at', sort_direction: 'DESC' };

    const { sort = false, direction = 'DESC' } = filters.reaction;
    const group = filters.reaction.group || 'created_at';
    let sortColumn = 'updated_at';
    if (group === 'none' && sort) {
      sortColumn = 'created_at';
    } else if (sort && group) {
      sortColumn = group;
    }

    return { sort_column: sortColumn, sort_direction: direction };
  }

  static fetchById(id) {
    return ApiClient.getJson(`/api/v1/reactions/${id}`)
      .then((json) => this.reactionElement(json, id));
  }

  static findByShortLabel(shortLabel) {
    return ApiClient.getJson(`/api/v1/reactions/findByShortLabel/${shortLabel}`);
  }

  static create(reaction) {
    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(reaction.container),
      ...reaction.products.map((prod) => AttachmentFetcher.uploadNewAttachmentsForContainer(prod.container)),
    ];

    return Promise.all(tasks)
      .then(() => ApiClient.postJson('/api/v1/reactions', { body: reaction.serialize() }))
      .then((json) => {
        const { id } = json.reaction;
        return GenericElsFetcher.uploadGenericFiles(reaction, id, 'Reaction')
          .then(() => this.updateAnnotationsInReaction(reaction))
          .then(() => this.reactionElement(json, id));
      });
  }

  static update(reaction) {
    const tasks = [
      AttachmentFetcher.uploadNewAttachmentsForContainer(reaction.container),
      ...reaction.products.map((prod) => AttachmentFetcher.uploadNewAttachmentsForContainer(prod.container)),
      GenericElsFetcher.uploadGenericFiles(reaction, reaction.id, 'Reaction'),
    ];

    return Promise.all(tasks)
      .then(() => this.updateAnnotationsInReaction(reaction))
      .then(() => ApiClient.putJson(`/api/v1/reactions/${reaction.id}`, { body: reaction.serialize() }))
      .then((json) => this.reactionElement(json, reaction.id));
  }

  static updateAnnotationsInReaction(reaction) {
    const tasks = [
      AnnotationsFetcher.updateAnnotationsInContainer(reaction),
      ...reaction.products.map((e) => AnnotationsFetcher.updateAnnotationsInContainer(e)),
    ];
    return Promise.all(tasks);
  }

  static reactionElement(json, id) {
    if (json.error) {
      return new Reaction({ id: `${id}:error:Reaction ${id} is not accessible!` });
    }

    const userLabels = json?.reaction?.tag?.taggable_data?.user_labels || null;

    const reaction = new Reaction(json.reaction);
    const { catalystMoles, vesselSize } = reaction.findReactionVesselSizeCatalystMaterialValues();
    if (vesselSize) {
      GasPhaseReactionActions.setReactionVesselSize(vesselSize);
    }
    if (catalystMoles) {
      GasPhaseReactionActions.setCatalystReferenceMole(catalystMoles);
    }
    const { weightPercentageReference, targetAmount } = reaction.findWeightPercentageReferenceMaterial();
    if (weightPercentageReference) {
      WeightPercentageReactionActions.setWeightPercentageReference(weightPercentageReference);
      WeightPercentageReactionActions.setTargetAmountWeightPercentageReference(targetAmount);
    }
    if (json.literatures && json.literatures.length > 0) {
      const tliteratures = json.literatures.map((literature) => new Literature(literature));
      const lits = tliteratures.reduce((acc, l) => acc.set(l.literal_id, l), new Map());
      reaction.literatures = lits;
    }
    if (json.research_plans && json.research_plans.length > 0) {
      reaction.research_plans = json.research_plans;
    }
    reaction.updateMaxAmountOfProducts();
    if (!userLabels) reaction.user_labels = userLabels;
    return reaction;
  }
}
