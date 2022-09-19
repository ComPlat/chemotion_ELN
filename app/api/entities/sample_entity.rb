# frozen_string_literal: true

module Entities
  class SampleEntity < ApplicationEntity
    # rubocop:disable Layout/LineLength, Layout/ExtraSpacing
    # Level 0 Attributes
    expose! :can_copy,                unless: :displayed_in_list, anonymize_below: 0
    expose! :can_update,              unless: :displayed_in_list, anonymize_below: 0
    expose! :decoupled,                                           anonymize_below: 0
    expose! :id,                                                  anonymize_below: 0
    expose! :is_restricted,                                       anonymize_below: 0
    expose! :molecular_mass,                                      anonymize_below: 0
    expose! :sum_formula,                                         anonymize_below: 0
    expose! :type,                                                anonymize_below: 0
    expose! :external_label,                                      anonymize_below: 0
    expose! :can_publish,             unless: :displayed_in_list, anonymize_below: 0

    # Level 1 Attributes
    expose! :molfile,                                             anonymize_below: 1

    # Level 2+3 only gain additional relations for analyses and container

    with_options(anonymize_below: 10) do
      expose! :_contains_residues,      unless: :displayed_in_list, anonymize_with: false
      expose! :ancestor_ids
      expose! :boiling_point,           unless: :displayed_in_list
      expose! :children_count,          unless: :displayed_in_list
      expose! :density
      expose! :description,             unless: :displayed_in_list
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
      expose! :sample_svg_file
      expose! :short_label
      expose! :showed_name
      expose! :solvent,                 unless: :displayed_in_list, anonymize_with: []
      expose! :stereo
      expose! :target_amount_unit,      unless: :displayed_in_list
      expose! :target_amount_value,     unless: :displayed_in_list
      expose! :user_labels
      expose! :xref
    end

    expose_timestamps

    # relations
    expose! :analyses,                unless: :displayed_in_list, anonymize_below: 2,  anonymize_with: [],   using: 'Entities::ContainerEntity'
    expose! :code_log,                unless: :displayed_in_list, anonymize_below: 0,                        using: 'Entities::CodeLogEntity'
    expose! :container,               unless: :displayed_in_list, anonymize_below: 2,  anonymize_with: nil,  using: 'Entities::ContainerEntity'
    expose! :elemental_compositions,  unless: :displayed_in_list, anonymize_below: 10, anonymize_with: [],   using: 'Entities::ElementalCompositionEntity'
    expose! :molecule,                                            anonymize_below: 10,                       using: 'Entities::MoleculeEntity'
    expose! :residues,                unless: :displayed_in_list, anonymize_below: 10, anonymize_with: [],   using: 'Entities::ResidueEntity'
    expose! :segments,                unless: :displayed_in_list, anonymize_below: 10,                       using: 'Entities::SegmentEntity'
    expose! :tag,                                                 anonymize_below: 10,                       using: 'Entities::ElementTagEntity'
    # rubocop:enable Layout/LineLength, Layout/ExtraSpacing

    private

    def _contains_residues
      object.residues.any?
    end

    def analyses
      if detail_levels[Sample] < 3
        object.analyses.map { |analysis_container| analysis_container['datasets'] = { datasets: [] } }
      else
        object.analyses
      end
    end

    def can_update
      options[:policy].try(:update?) || false
    end

    def can_copy
      options[:policy].try(:copy?) || false
    end

    def can_publish
      options[:policy].try(:destroy?) || false
    end

    def children_count
      object.new_record? ? 0 : object.children.count.to_i
    end

    def is_restricted # rubocop:disable Naming/PredicateName
      detail_levels[Sample] < 10
    end

    # molecule returns only minimal values for detail level 0
    def molecule
      return object.molecule if detail_levels[Sample] > 0 # rubocop:disable Style/NumericPredicate

      {
        molecular_weight: object.molecule.try(:molecular_weight),
        exact_molecular_weight: object.molecule.try(:exact_molecular_weight)
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
      object.parent&.id
    end

    def type
      'sample'
    end
  end
end
