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
      expose! :editor_link_target
      expose! :intermediate_type
    end

    # Level 1 attributes
    expose! :molfile, anonymize_below: 1

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
      expose! :molarity_unit,           unless: :displayed_in_list
      expose! :molarity_value,          unless: :displayed_in_list
      expose! :molecule_name_hash,                                  anonymize_with: {}
      expose! :name
      expose! :parent_id,               unless: :displayed_in_list
      expose! :pubchem_tag
      expose! :purity
      expose! :reaction_description,    unless: :displayed_in_list
      expose! :real_amount_unit,        unless: :displayed_in_list
      expose! :real_amount_value,       unless: :displayed_in_list
      expose! :residues,                unless: :displayed_in_list, anonymize_with: [],   using: 'Entities::ResidueEntity'
      expose! :sample_svg_file
      expose! :segments,                unless: :displayed_in_list, anonymize_with: [],   using: 'Labimotion::SegmentEntity'
      expose! :short_label
      expose! :showed_name
      expose! :solvent,                 unless: :displayed_in_list, anonymize_with: []
      expose! :stereo
      expose! :tag,                                                 anonymize_with: nil,  using: 'Entities::ElementTagEntity'
      expose! :target_amount_unit,      unless: :displayed_in_list
      expose! :target_amount_value,     unless: :displayed_in_list
      expose! :xref
      expose! :sample_type
      expose! :sample_details
      expose! :components,              unless: :displayed_in_list, anonymize_with: [],   using: 'Entities::ComponentEntity'
      expose! :reaction_step
    end
    # rubocop:enable Layout/ExtraSpacing, Metrics/BlockLength

    expose_timestamps

    private

    def _contains_residues
      object.residues.any?
    end

    def can_update
      options[:policy].try(:update?) || false
    end

    def can_publish
      options[:policy].try(:destroy?) || false
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
      object.comments.count
    end

    def gas_type
      object.reactions_samples.pick(:gas_type)
    end

    def gas_phase_data
      object.reactions_samples.pick(:gas_phase_data)
    end

    def weight_percentage
      object.reactions_samples.pick(:weight_percentage)
    end

    def intermediate_type
      intermediate_sample&.intermediate_type
    end

    def reaction_step
      # Enhancement for IntermediateSamples which originate from the ReactionProcessEditor
      # We want to present the position of the ReactionProcessStep in which the object (Sample) was saved.
      intermediate_sample&.reaction_process_step&.step_number
    end

    def editor_link_target
      # The link to the Reaction Process Editor (external to the ELN).
      "#{ENV.fetch('REACTION_PROCESS_EDITOR_HOSTNAME')}/samples/#{object.id}?auth=#{object.creator.jti_auth_token}"
    end

    def intermediate_sample
      ReactionsIntermediateSample.find_by(sample_id: object.id)
    end
  end
end
