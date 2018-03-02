module Chemotion
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
        requires :isSync, type: Boolean
      end

      def search_possibilities_to_suggestions(search_possibilities)
        suggestions = []
        search_possibilities.each do |k,v|
          suggestions += v.map {|x| {name: x, search_by_method: k}}
        end
        suggestions
      end

      def search_possibilities_by_type_user_and_collection(type)
        collection_id = @collection_id
        dl = permission_level_for_collection(
          params[:collection_id], params[:isSync]
        )
        dl_s = dl[:sample_detail_level]
        dl_r = dl[:reaction_detail_level]
        dl_wp = dl[:wellplate_detail_level]
        dl_sc = dl[:screen_detail_level]

        d_for = Proc.new do |klass|
          klass.by_collection_id(collection_id)
        end

        search_by_field = Proc.new do |klass, field, qry|
          scope = d_for.call klass
          scope.send("by_#{field}", qry).page(1).per(page_size).pluck(field).uniq
        end

        qry = params[:query]

        case type
        when 'sample'
          sample_short_label = dl_s > 0 && search_by_field.call(Sample, :short_label, qry) || []
          sample_external_label = dl_s > -1 && search_by_field.call(Sample, :external_label, qry) || []
          sample_name = dl_s > 0 && search_by_field.call(Sample, :name, qry) || []
          polymer_type = dl_s > 0 && d_for.call(Sample).joins(:residues)
            .where("residues.custom_info -> 'polymer_type' ILIKE '%#{qry}%'")
            .pluck("residues.custom_info -> 'polymer_type'").uniq || []
          sum_formula = dl_s > 0 && search_by_field.call(Molecule, :sum_formular, qry) || []
          iupac_name = dl_s > 0 && search_by_field.call(Molecule, :iupac_name, qry) || []
          inchistring = dl_s > 0 && search_by_field.call(Molecule, :inchistring, qry) || []
          cano_smiles = dl_s > 0 && search_by_field.call(Molecule, :cano_smiles, qry) || []
          {
            sample_short_label: sample_short_label,
            sample_external_label: sample_external_label,
            sample_name: sample_name,
            polymer_type: polymer_type,
            sum_formula: sum_formula,
            iupac_name: iupac_name,
            inchistring: inchistring,
            cano_smiles: cano_smiles
          }
        when 'reaction'
          reaction_name = dl_r > -1 && search_by_field.call(Reaction, :name, qry) || []
          reaction_short_label = dl_r > -1 && search_by_field.call(Reaction, :short_label, qry) || []
          reaction_status = dl_r > -1 && search_by_field.call(Reaction, :status, qry) || []
          sample_name = dl_s > 0 && d_for.call(Sample).with_reactions.by_name(qry).pluck(:name).uniq || []
          iupac_name = dl_s > 0 && d_for.call(Molecule).with_reactions.by_iupac_name(qry).pluck(:iupac_name).uniq || []
          inchistring = dl_s > 0 && d_for.call(Molecule).with_reactions.by_inchistring(qry).pluck(:inchistring).uniq || []
          cano_smiles = dl_s > 0 && d_for.call(Molecule).with_reactions.by_cano_smiles(qry).pluck(:cano_smiles).uniq || []
          {
            reaction_name: reaction_name,
            reaction_short_label: reaction_short_label,
            reaction_status: reaction_status,
            sample_name: sample_name,
            iupac_name: iupac_name,
            inchistring: inchistring,
            cano_smiles: cano_smiles
          }
        when 'wellplate'
          wellplate_name = dl_wp > -1 && search_by_field.call(Wellplate, :name, qry) || []
          sample_name = dl_s > 0 && d_for.call(Sample).with_wellplates.by_name(qry).pluck(:name).uniq || []
          iupac_name = dl_s > 0 && d_for.call(Molecule).with_wellplates.by_iupac_name(qry).pluck(:iupac_name).uniq || []
          inchistring = dl_s > 0 && d_for.call(Molecule).with_wellplates.by_inchistring(qry).pluck(:inchistring).uniq || []
          cano_smiles = dl_s > 0 && d_for.call(Molecule).with_wellplates.by_cano_smiles(qry).pluck(:cano_smiles).uniq || []
          {
            wellplate_name: wellplate_name,
            sample_name: sample_name,
            iupac_name: iupac_name,
            inchistring: inchistring,
            cano_smiles: cano_smiles
          }
        when 'screen'
          screen_name = dl_sc > -1 &&  search_by_field.call(Screen, :name, qry) || []
          conditions = dl_sc > -1 &&  search_by_field.call(Screen, :conditions, qry) || []
          requirements = dl_sc > -1 &&  search_by_field.call(Screen, :requirements, qry) || []
          {
            screen_name: screen_name,
            conditions: conditions,
            requirements: requirements
          }
        else
          sample_name = dl_s > 0 && search_by_field.call(Sample, :name, qry) || []
          sample_short_label = dl_s > 0 && search_by_field.call(Sample, :short_label, qry) || []
          sample_external_label = dl_s > -1 && search_by_field.call(Sample, :external_label, qry) || []
          polymer_type = dl_s > 0 && d_for.call(Sample).joins(:residues)
            .where("residues.custom_info -> 'polymer_type' ILIKE '%#{qry}%'")
            .pluck("residues.custom_info -> 'polymer_type'").uniq || []
          sum_formula = dl_s > 0 && search_by_field.call(Molecule, :sum_formular, qry) || []
          iupac_name = dl_s > 0 && search_by_field.call(Molecule, :iupac_name, qry) || []
          inchistring = dl_s > 0 && search_by_field.call(Molecule, :inchistring, qry) || []
          cano_smiles = dl_s > 0 && search_by_field.call(Molecule, :cano_smiles, qry) || []
          reaction_name = dl_r > -1 && search_by_field.call(Reaction, :name, qry) || []
          reaction_status = dl_r > -1 && search_by_field.call(Reaction, :status, qry) || []
          reaction_short_label = dl_r > -1 && search_by_field.call(Reaction, :short_label, qry) || []
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
            cano_smiles: cano_smiles,
            reaction_name: reaction_name,
            reaction_short_label: reaction_short_label,
            reaction_status: reaction_status,
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
        @collection_id = fetch_collection_id_w_current_user(
          params[:collection_id], params[:isSync]
        )
      end

      namespace :all do
        desc 'Return all suggestions for AutoCompleteInput'
        params do
          use :suggestion_params
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection('all')

            {
              suggestions:
                search_possibilities_to_suggestions(search_possibilities)
            }
          end
        end
      end

      namespace :samples do
        desc 'Return sample suggestions for AutoCompleteInput'
        params do
          use :suggestion_params
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection('sample')
            {
              suggestions:
                search_possibilities_to_suggestions(search_possibilities)
            }
          end
        end
      end

      namespace :reactions do
        desc 'Return reaction suggestions for AutoCompleteInput'
        params do
          use :suggestion_params
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection('reaction')
            {
              suggestions:
                search_possibilities_to_suggestions(search_possibilities)
            }
          end
        end
      end

      namespace :wellplates do
        desc 'Return wellplate suggestions for AutoCompleteInput'
        params do
          use :suggestion_params
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection('wellplate')
            {
              suggestions:
                search_possibilities_to_suggestions(search_possibilities)
            }
          end
        end
      end

      namespace :screens do
        desc 'Return screen suggestions for AutoCompleteInput'
        params do
          use :suggestion_params
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection('screen')
            {
              suggestions:
                search_possibilities_to_suggestions(search_possibilities)
            }
          end
        end
      end

    end
  end
end
