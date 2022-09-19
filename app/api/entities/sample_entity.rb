# frozen_string_literal: true

module Entities
  class SampleEntity < ApplicationEntity
    # Level 0 Attributes
    expose! :can_copy,                unless: :displayed_in_list, anonymized_below: 0
    expose! :can_update,              unless: :displayed_in_list, anonymized_below: 0
    expose! :decoupled,                                           anonymized_below: 0
    expose! :id,                                                  anonymized_below: 0
    expose! :is_restricted,                                       anonymized_below: 0
    expose! :molecular_mass,                                      anonymized_below: 0
    expose! :sum_formula,                                         anonymized_below: 0
    expose! :type,                                                anonymized_below: 0
    expose! :external_label,                                      anonymized_below: 0
    expose! :can_publish,             unless: :displayed_in_list, anonymized_below: 0

    # Level 1 Attributes
    expose! :molfile,                                             anonymized_below: 1

    # Level 2+3 only gain additional relations for analyses and container

    with_options(anonymized_below: 10) do |klass|
      klass.expose! :_contains_residues,      unless: :displayed_in_list, anonymize_with: false
      klass.expose! :ancestor_ids,
      klass.expose! :boiling_point,           unless: :displayed_in_list,
      klass.expose! :children_count,          unless: :displayed_in_list,
      klass.expose! :density,
      klass.expose! :description,             unless: :displayed_in_list,
      klass.expose! :imported_readout,        unless: :displayed_in_list,
      klass.expose! :is_top_secret,
      klass.expose! :location,                unless: :displayed_in_list,
      klass.expose! :melting_point,           unless: :displayed_in_list,
      klass.expose! :metrics,
      klass.expose! :molarity_unit,           unless: :displayed_in_list,
      klass.expose! :molarity_value,          unless: :displayed_in_list,
      klass.expose! :molecule_name_hash,                                  anonymize_with: {}
      klass.expose! :name,
      klass.expose! :parent_id,               unless: :displayed_in_list,
      klass.expose! :pubchem_tag,
      klass.expose! :purity,
      klass.expose! :reaction_description,    unless: :displayed_in_list,
      klass.expose! :real_amount_unit,        unless: :displayed_in_list,
      klass.expose! :real_amount_value,       unless: :displayed_in_list,
      klass.expose! :sample_svg_file,
      klass.expose! :short_label,
      klass.expose! :showed_name,
      klass.expose! :solvent,                 unless: :displayed_in_list, anonymize_with: []
      klass.expose! :stereo,
      klass.expose! :target_amount_unit,      unless: :displayed_in_list,
      klass.expose! :target_amount_value,     unless: :displayed_in_list,
      klass.expose! :user_labels,
      klass.expose! :xref
    end

    expose_timestamps

    # relations
    expose! :analyses,                unless: :displayed_in_list, anonymized_below: 2,  anonymize_with: [],   using: 'Entities::ContainerEntity'
    expose! :code_log,                unless: :displayed_in_list, anonymized_below: 0,                        using: 'Entities::CodeLogEntity'
    expose! :container,               unless: :displayed_in_list, anonymized_below: 2,  anonymize_with: nil,  using: 'Entities::ContainerEntity'
    expose! :elemental_compositions,  unless: :displayed_in_list, anonymized_below: 10, anonymize_with: [],   using: 'Entities::ElementalCompositionEntity'
    expose! :molecule,                                            anonymized_below: 10,                       using: 'Entities::MoleculeEntity'
    expose! :residues,                unless: :displayed_in_list, anonymized_below: 10, anonymize_with: []    using: 'Entities::ResidueEntity'
    expose! :segments,                unless: :displayed_in_list, anonymized_below: 10,                       using: 'Entities::SegmentEntity'
    expose! :tag,                                                 anonymized_below: 10,                       using: 'Entities::ElementTagEntity'

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
      (options[:policy] && options[:policy].try(:update?)) || false
    end

    def can_copy
      (options[:policy] && options[:policy].try(:copy?)) || false
    end

    def can_publish
      (options[:policy] && options[:policy].try(:destroy?)) || false
    end

    def children_count
      object.new_record? ? 0 : object.children.count.to_i
    end

    def is_restricted
      detail_level[Sample] < 10
    end

    # molecule returns only minimal values for detail level 0
    def molecule
      return molecule if detail_level[Sample] > 0

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
      object.parent&.id
    end

    def type
      'sample'
    end
  end
end
