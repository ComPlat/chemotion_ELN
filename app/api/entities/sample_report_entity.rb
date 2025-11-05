# frozen_string_literal: true

module Entities
  class SampleReportEntity < SampleEntity
    with_options(anonymize_below: 0) do
      expose :collections
    end

    with_options(anonymize_below: 2) do
      expose! :analyses,            anonymize_with: [], using: 'Entities::ContainerReportEntity'
    end

    with_options(anonymize_below: 10) do
      expose! :reactions,           anonymize_with: []
      expose! :molecule_iupac_name, anonymize_with: nil
      expose! :get_svg_path,        anonymize_with: nil
      expose! :literatures,         anonymize_with: []
    end
    expose_timestamps

    private

    def collections
      if object.collections.first.is_a?(CollectionShare)
        Entities::SharedCollectionEntity.represent(object.collections)
      else
        Entities::OwnCollectionEntity.represent(object.collections)
      end
    end

    def literatures
      Entities::LiteratureEntity.represent(
        Literature.by_element_attributes_and_cat(object.id, 'Sample', 'detail').with_user_info,
        with_user_info: true,
      )
    end

    def reaction
      Entities::ReactionReportEntity.represent(
        object,
        current_user: current_user,
        detail_levels: ElementDetailLevelCalculator.new(user: current_user, element: object).detail_levels,
      ).serializable_hash
    end
  end
end
