# frozen_string_literal: true

# rubocop:disable Rails/SkipsModelValidations

# Create or restore All and chemotion-repo collections
Person.find_each do |user|
  ['All', 'chemotion-repository.net'].each.with_index do |name, position|
    params = { user_id: user.id, label: name, is_locked: true }
    Collection.find_by(**params) ||
      Collection.only_deleted.find_by(**params)&.update_column(:deleted_at, nil) ||
      Collection.create(position: position, **params)
  end
  # Ensure collection All content is up to date
  all_id = user.collections.find_by(label: 'All', is_locked: true).id
  user_collections = Collection.where(user_id: user.id).pluck(:id)
  [
    CollectionsSample, CollectionsReaction, CollectionsScreen,
    CollectionsWellplate, CollectionsResearchPlan,
    CollectionsCellline,
    Labimotion::CollectionsElement
  ].each do |model|
    fk = model.element_foreign_key.to_sym
    element_ids = model.where(collection_id: user_collections).pluck(fk)
    model.insert_in_collection(element_ids, all_id)
  end
end

# rubocop:enable Rails/SkipsModelValidations
