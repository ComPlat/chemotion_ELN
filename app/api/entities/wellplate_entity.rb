# frozen_string_literal: true

module Entities
  class WellplateEntity < ApplicationEntity
    expose(
      :description,
      :id,
      :name,
      :readout_titles,
      :short_label,
      :size,
      :type,
    )
    expose_timestamps

    expose :wells, using: 'Entities::WellEntity'
    expose :container, using: 'Entities::ContainerEntity'
    expose :tag, using: 'Entities::ElementTagEntity'
    expose :segments, using: 'Entities::SegmentEntity'
    expose :code_log, using: 'Entities::CodeLogEntity'

    private

    def code_log
      displayed_in_list? ? nil : object.code_log
    end

    def container
      displayed_in_list? ? nil : object.container
    end

    def segments
      displayed_in_list? ? [] : object.segments
    end

    def wells
      displayed_in_list? ? [] : object.ordered_wells.includes(:sample)
    end

    def type
      'wellplate'
    end
  end
end
