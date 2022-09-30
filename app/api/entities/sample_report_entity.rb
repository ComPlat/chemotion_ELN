# frozen_string_literal: true

# rubocop:disable Layout/ExtraSpacing
module Entities
  class SampleReportEntity < SampleEntity
    with_options(anonymize_below: 0) do
      expose :collections,                              using: 'Entities::CollectionEntity'
    end

    with_options(anonymize_below: 2) do
      expose! :analyses,            anonymize_with: [], using: 'Entities::ContainerEntity'
    end

    with_options(anonymize_below: 10) do
      expose! :reactions,           anonymize_with: [], using: 'Entities::ReationReportEntity'
      expose! :molecule_iupac_name, anonymize_with: nil
      expose! :get_svg_path,        anonymize_with: nil
      expose! :literatures,         anonymize_with: [], using: 'Entities::LiteratureEntity',   with_user_info: true
    end

    expose_timestamps

    def literatures
      Literature.by_element_attributes_and_cat(object.id, 'Sample', 'detail').with_user_info
    end
  end
end
# rubocop:enable Layout/ExtraSpacing
