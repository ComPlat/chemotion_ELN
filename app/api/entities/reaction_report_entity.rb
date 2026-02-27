# frozen_string_literal: true

module Entities
  class ReactionReportEntity < ReactionEntity
    with_options(anonymize_below: 0) do
      expose! :collections
      expose! :literatures
      expose! :products,                                        using: 'Entities::ReactionMaterialReportEntity'
      expose! :purification_solvents,                           using: 'Entities::ReactionMaterialReportEntity'
      expose! :reactants,                                       using: 'Entities::ReactionMaterialReportEntity'
      expose! :solvents,                                        using: 'Entities::ReactionMaterialReportEntity'
      expose! :starting_materials,                              using: 'Entities::ReactionMaterialReportEntity'
      expose! :temperature_display_with_unit
    end

    private

    def literatures
      Entities::LiteratureEntity.represent(
        Literature.by_element_attributes_and_cat(object.id, 'Reaction', 'detail').with_user_info,
        with_user_info: true
      )
    end

    def collections
      if object.collections.first.is_a?(CollectionShare)
        Entities::SharedCollectionEntity.represent(object.collections, current_user: current_user)
      else
        Entities::OwnCollectionEntity.represent(object.collections, current_user: current_user)
      end
    end
  end
end
