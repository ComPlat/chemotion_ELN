# frozen_string_literal: true

module Entities
  class WellplateEntity < ApplicationEntity

    # Level 0 attributes and relations
    with_options(anonymize_below: 0) do
      expose! :id
      expose! :is_restricted
      expose! :size
      expose! :type
      expose! :wells,                                using: 'Entities::WellEntity'
    end

    with_options(anonymize_below: 10) do
      expose! :code_log,        anonymize_with: nil, using: 'Entities::CodeLogEntity'
      expose! :container,       anonymize_with: nil, using: 'Entities::ContainerEntity'
      expose! :description
      expose! :name
      expose! :readout_titles
      expose! :segments,        anonymize_with: [],  using: 'Entities::SegmentEntity'
      expose! :short_label
      expose! :tag,             anonymize_with: nil, using: 'Entities::ElementTagEntity'
    end

    expose_timestamps

    private

    def is_restricted
      detail_levels[Wellplate] < 10
    end

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
