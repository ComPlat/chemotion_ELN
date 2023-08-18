# frozen_string_literal: true

module Entities
  class WellplateEntity < ApplicationEntity
    # rubocop:disable Layout/ExtraSpacing
    # Level 0 attributes and relations
    with_options(anonymize_below: 0) do
      expose! :id
      expose! :is_restricted
      expose! :size
      expose! :type
      expose! :wells,                                using: 'Entities::WellEntity'
      expose! :comment_count
      expose! :can_update,      unless: :displayed_in_list
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
    # rubocop:enable Layout/ExtraSpacing

    expose_timestamps

    private

    def is_restricted # rubocop:disable Naming/PredicateName
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
      displayed_in_list? ? [] : object.ordered_wells_with_samples
    end

    def type
      'wellplate'
    end

    def comment_count
      object.comments.count
    end

    def can_update
      options[:policy].try(:update?) || false
    end
  end
end
