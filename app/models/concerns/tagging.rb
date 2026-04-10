# frozen_string_literal: true

# update ElementTag when Element joint table association is updated
# rubocop: disable Metrics/CyclomaticComplexity
module Tagging
  extend ActiveSupport::Concern

  included do
    after_create :update_tag
    after_destroy :update_tag
    after_restore :update_tag
  end

  def update_tag
    klass = self.class.name
    case klass
    when 'ReactionsProductSample', 'ReactionsStartingMaterialSample',
      'ReactionsSolventSample', 'ReactionsReactantSample'
      args = { reaction_tag: reaction_id, resources_tag: true }
      element = 'sample'
    when 'Well'
      args = { wellplate_tag: wellplate_id }
      element = 'sample'
    when 'Labimotion::ElementsSample'
      el = Labimotion::Element.find_by(id: element_id)
      return if el.nil?

      args = if deleted_at.nil?
               { element_tag: { type: el.element_klass.name,
                                id: element_id }, resources_tag: true }
             else
               { element_tag: {}, resources_tag: true }
             end
      element = 'sample'
    when 'CollectionsReaction', 'CollectionsWellplate', 'CollectionsSample', 'Labimotion::CollectionsElement',
      'CollectionsScreen', 'CollectionsResearchPlan', 'CollectionsDeviceDescription'
      args = { collection_tag: true }
      element = Labimotion::Utils.elname_by_collection(klass)
    when 'CollectionsCellline'
      args = { collection_tag: true }
      element = 'cellline_sample'
    when 'CollectionsVessel'
      args = { collection_tag: true }
      element = 'vessel'
    end

    element && send(element)&.update_tag!(args)
  end
end
# rubocop: enable Metrics/CyclomaticComplexity
