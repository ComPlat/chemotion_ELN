# frozen_string_literal: true

module Entities
  class SampleReportEntity < SampleEntity
    expose(
      :reactions,
      :molecule_iupac_name,
      :get_svg_path,
      :literatures
    )

    expose_timestamps

    expose :collections, using: 'Entities::CollectionEntity'

    def literatures
      Literature.by_element_attributes_and_cat(object.id, 'Sample', 'detail').with_user_info
    end
  end
end
