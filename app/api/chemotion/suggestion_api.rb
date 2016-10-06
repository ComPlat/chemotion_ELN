module Chemotion
  class SuggestionAPI < Grape::API
    include Grape::Kaminari

    helpers do
      def page_size
        7
      end

      def search_possibilities_to_suggestions(search_possibilities)
        suggestions = []
        search_possibilities.each do |k,v|
          suggestions += v.map {|x| {name: x, search_by_method: k}}
        end
        suggestions
      end

      def search_possibilities_by_type_user_and_collection(
        type, user_id, collection_id)
        d_for = Proc.new do |klass|
          klass.for_user(user_id).by_collection_id(collection_id)
        end

        search_by_field = Proc.new do |klass, field, qry|
          scope = d_for.call klass
          scope.send("by_#{field}", qry).page(1).per(page_size).pluck(field).uniq
        end

        qry = params[:query]

        case type
        when 'sample'
          {
            sample_short_label: search_by_field.call(Sample, :short_label, qry),
            sample_external_label: search_by_field.call(Sample, :external_label, qry),
            sample_name: search_by_field.call(Sample, :name, qry),
            polymer_type: d_for.call(Sample).joins(:residues)
              .where("residues.custom_info -> 'polymer_type' ILIKE '%#{qry}%'")
              .pluck("residues.custom_info -> 'polymer_type'").uniq,
            sum_formula: search_by_field.call(Molecule, :sum_formular, qry),
            iupac_name: search_by_field.call(Molecule, :iupac_name, qry),
            inchistring: search_by_field.call(Molecule, :inchistring, qry),
            cano_smiles: search_by_field.call(Molecule, :cano_smiles, qry)
          }
        when 'reaction'
          {
            reaction_name: search_by_field.call(Reaction, :name, qry),
            sample_name: d_for.call(Sample).with_reactions.by_name(qry)
              .pluck(:name).uniq,
            iupac_name: d_for.call(Molecule).with_reactions.by_iupac_name(qry)
              .pluck(:iupac_name).uniq,
            inchistring: d_for.call(Molecule).with_reactions.by_inchistring(qry)
              .pluck(:inchistring).uniq,
            cano_smiles: d_for.call(Molecule).with_reactions.by_cano_smiles(qry)
              .pluck(:cano_smiles).uniq
          }
        when 'wellplate'
          {
            wellplate_name: search_by_field.call(Wellplate, :name, qry),
            sample_name: d_for.call(Sample).with_wellplates.by_name(qry)
              .pluck(:name).uniq,
            iupac_name: d_for.call(Molecule).with_wellplates.by_iupac_name(qry)
              .pluck(:iupac_name).uniq,
            inchistring: d_for.call(Molecule).with_wellplates.by_inchistring(qry)
              .pluck(:inchistring).uniq,
            cano_smiles: d_for.call(Molecule).with_wellplates.by_cano_smiles(qry)
              .pluck(:cano_smiles).uniq
          }
        when 'screen'
          {
            screen_name: search_by_field.call(Screen, :name, qry),
            conditions: search_by_field.call(Screen, :conditions, qry),
            requirements: search_by_field.call(Screen, :requirements, qry)
          }
        else
          {
            sample_name: search_by_field.call(Sample, :name, qry),
            sample_short_label: search_by_field.call(Sample, :short_label, qry),
            sample_external_label: search_by_field.call(Sample, :external_label, qry),
            polymer_type: d_for.call(Sample).joins(:residues)
              .where("residues.custom_info -> 'polymer_type' ILIKE '%#{qry}%'")
              .pluck("residues.custom_info -> 'polymer_type'").uniq,
            sum_formula: search_by_field.call(Molecule, :sum_formular, qry),
            iupac_name: search_by_field.call(Molecule, :iupac_name, qry),
            inchistring: search_by_field.call(Molecule, :inchistring, qry),
            cano_smiles: search_by_field.call(Molecule, :cano_smiles, qry),
            reaction_name: search_by_field.call(Reaction, :name, qry),
            wellplate_name: search_by_field.call(Wellplate, :name, qry),
            screen_name: search_by_field.call(Screen, :name, qry),
            conditions: search_by_field.call(Screen, :conditions, qry),
            requirements: search_by_field.call(Screen, :requirements, qry)
          }
        end
      end
    end

    resource :suggestions do

      namespace :all do
        desc 'Return all suggestions for AutoCompleteInput'
        params do
          requires :user_id, type: Integer, desc: 'Current user id'
          requires :collection_id, type: String
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection(
                'all', params[:user_id], params[:collection_id])

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
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection(
                'sample', params[:user_id], params[:collection_id]
              )
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
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection(
                'reaction', params[:user_id], params[:collection_id]
              )
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
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection(
                'wellplate', params[:user_id], params[:collection_id]
              )
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
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            search_possibilities =
              search_possibilities_by_type_user_and_collection(
                'screen', params[:user_id], params[:collection_id]
              )
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
