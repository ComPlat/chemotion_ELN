# frozen_string_literal: true

module Chemotion
  # Input suggestion for free text search
  class SuggestionAPI < Grape::API
    include Grape::Kaminari

    helpers CollectionHelpers
    helpers do
      def page_size
        7
      end

      params :suggestion_params do
        requires :collection_id, type: String
        requires :query, type: String, desc: 'Search query'
        optional :is_sync, type: Boolean, default: false
        requires :query, type: String
      end

      def search_possibilities_to_suggestions(search_possibilities)
        suggestions = []
        search_possibilities.each do |k, v|
          suggestions += v.map { |x| { name: x, search_by_method: k } }
        end
        suggestions
      end

      def search_possibilities_by_type_user_and_collection(type)
        collection_id = @c_id
        dl = @dl
        dl_s = dl[:sample_detail_level]
        dl_r = dl[:reaction_detail_level]
        dl_wp = dl[:wellplate_detail_level]
        dl_sc = dl[:screen_detail_level]

        d_for = proc do |klass|
          klass.by_collection_id(collection_id)
        end

        search_by_field = proc do |klass, field, qry|
          scope = d_for.call klass
          scope.send("by_#{field}", qry).page(1).per(page_size).pluck(field).uniq
        end

        qry = params[:query]

        case type
        when 'samples'
          sample_short_label = dl_s.positive? && search_by_field.call(Sample, :short_label, qry) || []
          sample_external_label = dl_s > -1 && search_by_field.call(Sample, :external_label, qry) || []
          sample_name = dl_s.positive? && search_by_field.call(Sample, :name, qry) || []
          polymer_type = dl_s.positive? && d_for.call(Sample)
                                                .by_residues_custom_info('polymer_type', qry)
                                                .pluck("residues.custom_info -> 'polymer_type'").uniq || []
          sum_formula = dl_s.positive? && search_by_field.call(Molecule, :sum_formular, qry) || []
          iupac_name = dl_s.positive? && search_by_field.call(Molecule, :iupac_name, qry) || []
          inchistring = dl_s.positive? && search_by_field.call(Molecule, :inchistring, qry) || []
          inchikey = dl_s.positive? && search_by_field.call(Molecule, :inchikey, qry) || []
          cano_smiles = dl_s.positive? && search_by_field.call(Molecule, :cano_smiles, qry) || []
          {
            sample_short_label: sample_short_label,
            sample_external_label: sample_external_label,
            sample_name: sample_name,
            polymer_type: polymer_type,
            sum_formula: sum_formula,
            iupac_name: iupac_name,
            inchistring: inchistring,
            inchikey: inchikey,
            cano_smiles: cano_smiles
          }
        when 'reactions'
          reaction_name = dl_r > -1 && search_by_field.call(Reaction, :name, qry) || []
          reaction_short_label = dl_r > -1 && search_by_field.call(Reaction, :short_label, qry) || []
          reaction_status = dl_r > -1 && search_by_field.call(Reaction, :status, qry) || []
          reaction_rinchi_string = dl_r > -1 && search_by_field.call(Reaction, :rinchi_string, qry) || []
          sample_name = dl_s.positive? && d_for.call(Sample).with_reactions.by_name(qry).pluck(:name).uniq || []
          iupac_name = dl_s.positive? && d_for.call(Molecule).with_reactions.by_iupac_name(qry).pluck(:iupac_name).uniq || []
          inchistring = dl_s.positive? && d_for.call(Molecule).with_reactions.by_inchistring(qry).pluck(:inchistring).uniq || []
          cano_smiles = dl_s.positive? && d_for.call(Molecule).with_reactions.by_cano_smiles(qry).pluck(:cano_smiles).uniq || []
          {
            reaction_name: reaction_name,
            reaction_short_label: reaction_short_label,
            reaction_status: reaction_status,
            reaction_rinchi_string: reaction_rinchi_string,
            sample_name: sample_name,
            iupac_name: iupac_name,
            inchistring: inchistring,
            cano_smiles: cano_smiles
          }
        when 'wellplates'
          wellplate_name = dl_wp > -1 && search_by_field.call(Wellplate, :name, qry) || []
          sample_name = dl_s.positive? && d_for.call(Sample).with_wellplates.by_name(qry).pluck(:name).uniq || []
          iupac_name = dl_s.positive? && d_for.call(Molecule).with_wellplates.by_iupac_name(qry).pluck(:iupac_name).uniq || []
          inchistring = dl_s.positive? && d_for.call(Molecule).with_wellplates.by_inchistring(qry).pluck(:inchistring).uniq || []
          cano_smiles = dl_s.positive? && d_for.call(Molecule).with_wellplates.by_cano_smiles(qry).pluck(:cano_smiles).uniq || []
          {
            wellplate_name: wellplate_name,
            sample_name: sample_name,
            iupac_name: iupac_name,
            inchistring: inchistring,
            cano_smiles: cano_smiles
          }
        when 'screens'
          screen_name = dl_sc > -1 && search_by_field.call(Screen, :name, qry) || []
          conditions = dl_sc > -1 && search_by_field.call(Screen, :conditions, qry) || []
          requirements = dl_sc > -1 && search_by_field.call(Screen, :requirements, qry) || []
          {
            screen_name: screen_name,
            conditions: conditions,
            requirements: requirements
          }
        else
          sample_name = dl_s.positive? && search_by_field.call(Sample, :name, qry) || []
          sample_short_label = dl_s.positive? && search_by_field.call(Sample, :short_label, qry) || []
          sample_external_label = dl_s > -1 && search_by_field.call(Sample, :external_label, qry) || []
          polymer_type = dl_s.positive? && d_for.call(Sample)
                                                .by_residues_custom_info('polymer_type', qry)
                                                .pluck("residues.custom_info -> 'polymer_type'").uniq || []
          sum_formula = dl_s.positive? && search_by_field.call(Molecule, :sum_formular, qry) || []
          iupac_name = dl_s.positive? && search_by_field.call(Molecule, :iupac_name, qry) || []
          inchistring = dl_s.positive? && search_by_field.call(Molecule, :inchistring, qry) || []
          inchikey = dl_s.positive? && search_by_field.call(Molecule, :inchikey, qry) || []
          cano_smiles = dl_s.positive? && search_by_field.call(Molecule, :cano_smiles, qry) || []
          reaction_name = dl_r > -1 && search_by_field.call(Reaction, :name, qry) || []
          reaction_status = dl_r > -1 && search_by_field.call(Reaction, :status, qry) || []
          reaction_short_label = dl_r > -1 && search_by_field.call(Reaction, :short_label, qry) || []
          reaction_rinchi_string = dl_r > -1 && search_by_field.call(Reaction, :rinchi_string, qry) || []
          wellplate_name = dl_wp > -1 && search_by_field.call(Wellplate, :name, qry) || []
          screen_name = dl_sc > -1 && search_by_field.call(Screen, :name, qry) || []
          conditions = dl_sc > -1 && search_by_field.call(Screen, :conditions, qry) || []
          requirements = dl_sc > -1 && search_by_field.call(Screen, :requirements, qry) || []
          {
            sample_name: sample_name,
            sample_short_label: sample_short_label,
            sample_external_label: sample_external_label,
            polymer_type: polymer_type,
            sum_formula: sum_formula,
            iupac_name: iupac_name,
            inchistring: inchistring,
            inchikey: inchikey,
            cano_smiles: cano_smiles,
            reaction_name: reaction_name,
            reaction_short_label: reaction_short_label,
            reaction_status: reaction_status,
            reaction_rinchi_string: reaction_rinchi_string,
            wellplate_name: wellplate_name,
            screen_name: screen_name,
            conditions: conditions,
            requirements: requirements
          }
        end
      end
    end

    resource :suggestions do
      after_validation do
        set_var
      end

      route_param :element_type, type: String, values: %w[all samples reactions wellplates screens] do
        desc 'Return all suggestions for AutoCompleteInput'
        params do
          use :suggestion_params
        end
        get do
          params[:element_type]
          search_possibilities = search_possibilities_by_type_user_and_collection(params[:element_type])
          { suggestions: search_possibilities_to_suggestions(search_possibilities) }
        end
      end
    end
  end
end
