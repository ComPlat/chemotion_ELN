# frozen_string_literal: true

module Entities
  class SampleEntity < ApplicationEntity
    # rubocop:disable Layout/ExtraSpacing
    # Level 0 attributes and relations
    with_options(anonymize_below: 0) do
      expose! :can_copy,        unless: :displayed_in_list
      expose! :can_publish,     unless: :displayed_in_list
      expose! :can_update,      unless: :displayed_in_list
      expose! :code_log,        unless: :displayed_in_list, using: 'Entities::CodeLogEntity'
      expose! :decoupled
      expose! :inventory_sample
      expose! :external_label
      expose! :id
      expose! :is_restricted
      expose! :molecular_mass
      expose! :molecule,                                    using: 'Entities::MoleculeEntity'
      expose! :molecule_computed_props,                     using: 'Entities::ComputedPropEntity'
      expose! :sum_formula
      expose! :type
      expose :comments,                                     using: 'Entities::CommentEntity'
      expose :comment_count
      expose :dry_solvent
      expose! :gas_type
      expose! :gas_phase_data
      expose! :user_labels
      expose! :weight_percentage
    end

    # Level 1 attributes
    expose! :molfile,            anonymize_below: 1
    expose! :molecule_name_hash, anonymize_below: 1, anonymize_with: {}
    # showed_name (app/models/sample.rb) derives only from molecule_name and
    # molecule_iupac_name, both already unanonymized at this level — gating it
    # any higher protects nothing.
    expose! :showed_name,        anonymize_below: 1

    # Level 2 attributes and relations
    with_options(unless: :displayed_in_list, anonymize_below: 2, using: 'Entities::ContainerEntity') do
      # Analyses is no longer exposed as the old implementation in the serializer was broken anyway
      # Additionally, the frontend does not use the analyses field. It renders the analyses via the container field
      expose! :container, anonymize_with: nil
    end

    # rubocop:disable Metrics/BlockLength
    # Level 10 attributes and relations
    with_options(anonymize_below: 10) do
      expose! :_contains_residues,      unless: :displayed_in_list, anonymize_with: false
      expose! :ancestor_ids,                                        anonymize_with: []
      expose! :boiling_point,           unless: :displayed_in_list
      expose! :children_count,          unless: :displayed_in_list
      expose! :density
      expose! :description,             unless: :displayed_in_list
      expose! :elemental_compositions,  unless: :displayed_in_list, anonymize_with: [],   using: 'Entities::ElementalCompositionEntity'
      expose! :imported_readout,        unless: :displayed_in_list
      expose! :is_top_secret
      expose! :location,                unless: :displayed_in_list
      expose! :melting_point,           unless: :displayed_in_list
      expose! :metrics
      expose! :molarity_unit
      expose! :molarity_value
      expose! :name
      expose! :parent_id,               unless: :displayed_in_list
      expose! :pubchem_tag,                                         anonymize_with: nil
      expose! :purity
      expose! :reaction_description,    unless: :displayed_in_list
      expose! :real_amount_unit,        unless: :displayed_in_list
      expose! :real_amount_value,       unless: :displayed_in_list
      expose! :residues,                unless: :displayed_in_list, anonymize_with: [],   using: 'Entities::ResidueEntity'
      expose! :sample_svg_file
      expose! :segments,                unless: :displayed_in_list, anonymize_with: [],   using: 'Labimotion::SegmentEntity'
      expose! :short_label
      expose! :solvent,                 unless: :displayed_in_list, anonymize_with: []
      expose! :stereo,                                              anonymize_with: nil
      expose! :tag,                                                 anonymize_with: nil,  using: 'Entities::ElementTagEntity'
      expose! :target_amount_unit,      unless: :displayed_in_list
      expose! :target_amount_value,     unless: :displayed_in_list
      expose! :xref,                                                anonymize_with: {}
      expose! :sample_type
      expose! :sample_details,                                      anonymize_with: nil
      expose! :components,              unless: :displayed_in_list, anonymize_with: [],   using: 'Entities::ComponentEntity'
      expose! :is_legacy,                                           anonymize_with: false
      expose! :merged_sources,          unless: :displayed_in_list, anonymize_with: [],   using: 'Entities::MergedSourceEntity'
    end
    # rubocop:enable Layout/ExtraSpacing, Metrics/BlockLength

    expose_timestamps

    private

    def _contains_residues
      object.residues.any?
    end

    def can_publish
      element_policy.try(:destroy?) || false
    end

    def children_count
      object.new_record? ? 0 : object.children.count.to_i
    end

    def is_restricted
      detail_levels[Sample] < 10
    end

    # molecule returns only minimal values for detail level 0
    # Due to the way Grape::Entity works, the MoleculeEntity will return all keys nil except those two defined here
    def molecule
      return object.molecule if detail_levels[Sample] > 0 # rubocop:disable Style/NumericPredicate

      {
        molecular_weight: object.molecule.try(:molecular_weight),
        exact_molecular_weight: object.molecule.try(:exact_molecular_weight),
      }
    end

    def pubchem_tag
      return unless object.molecule
      return unless object.molecule.tag

      object.molecule.tag.taggable_data
    end

    def molfile
      return unless object.respond_to? :molfile

      object.molfile&.encode('utf-8', universal_newline: true, invalid: :replace, undef: :replace)
    end

    def parent_id
      object.parent_id
    end

    def type
      'sample'
    end

    def comment_count
      # Use size so the preloaded :comments association (see
      # Sample.includes_for_list_display) is counted in memory, avoiding an
      # N+1 COUNT(*) query per sample in the list endpoint.
      object.comments.size
    end

    def gas_type
      reactions_sample&.gas_type
    end

    def gas_phase_data
      reactions_sample&.gas_phase_data
    end

    def weight_percentage
      reactions_sample&.weight_percentage
    end

    # Memoized so gas_type/gas_phase_data/weight_percentage share one lookup instead of
    # each re-running .reactions_samples.first -- a no-op when the association is preloaded,
    # but three redundant queries per sample instead of one when it isn't (see element_api.rb's
    # load_report, which doesn't preload :reactions_samples).
    def reactions_sample
      return @reactions_sample if defined?(@reactions_sample)

      @reactions_sample = object.reactions_samples.first
    end

    def merged_sources
      object.merged_sources
    end
  end
end
