# frozen_string_literal: true

module Entities
  class SampleReportEntity < SampleEntity
    with_options(anonymize_below: 0) do
      expose :collections,                              using: 'Entities::CollectionEntity'
    end

    with_options(anonymize_below: 2) do
      expose! :analyses,            anonymize_with: [], using: 'Entities::ContainerEntity'
    end

    with_options(anonymize_below: 10) do
      expose! :reactions,           anonymize_with: [], using: 'Entities::ReactionReportEntity'
      expose! :molecule_iupac_name, anonymize_with: nil
      expose! :get_svg_path,        anonymize_with: nil
      expose! :literatures,         anonymize_with: []
    end
    expose_timestamps

    private

    def literatures
      Entities::LiteratureEntity.represent(
        Literature.by_element_attributes_and_cat(object.id, 'Sample', 'detail').with_user_info,
        with_user_info: true,
      )
    end
  end
end
