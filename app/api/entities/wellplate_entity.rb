# frozen_string_literal: true

module Entities
  class WellplateEntity < ApplicationEntity
    include NestedElementPolicy

    # rubocop:disable Layout/ExtraSpacing
    # Level 0 attributes and relations
    with_options(anonymize_below: 0) do
      expose! :can_update,                            unless: :displayed_in_list
      expose! :id
      expose! :is_restricted
      expose! :height
      expose! :width
      expose! :type
      expose! :wells,                                using: 'Entities::WellEntity'
      expose! :comment_count
      expose! :user_labels
    end

    # Exposed alongside Well#readouts (anonymize_below: 1) so a sharee never
    # receives real readout values with mismatched/placeholder column titles.
    with_options(anonymize_below: 1) do
      expose! :readout_titles,  anonymize_with: ['Readout']
    end

    with_options(anonymize_below: 10) do
      expose! :code_log,        anonymize_with: nil, using: 'Entities::CodeLogEntity'
      expose! :container,       anonymize_with: nil, using: 'Entities::ContainerEntity'
      expose! :description
      expose! :name
      expose! :segments,        anonymize_with: [],  using: 'Labimotion::SegmentEntity'
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
      # Use size so the preloaded :comments association (see
      # Wellplate.includes_for_list_display) is counted in memory, avoiding an
      # N+1 COUNT(*) query per wellplate in the list endpoint.
      object.comments.size
    end
  end
end
