module Chemotion
  class SuggestionAPI < Grape::API
    helpers do
      def search_possibilities_to_suggestions(search_possibilities)
        suggestions = []
        search_possibilities.each do |k,v|
          suggestions += v.map {|x| {name: x, search_by_method: k}}
        end
        suggestions
      end

      def search_possibilities_by_type(type)
        case type
        when 'sample'
          {
            sample_name: Sample.by_name(params[:query]).pluck(:name),
            sum_formula: Molecule.by_formula(params[:query]).map(&:sum_formular),
            iupac_name: Molecule.by_iupac_name(params[:query]).map(&:iupac_name)
          }
        when 'reaction'
          {
            reaction_name: Reaction.by_name(params[:query]).pluck(:name),
            sample_name: Sample.with_reactions.by_name(params[:query]).pluck(:name),
            iupac_name: Molecule.with_reactions.by_iupac_name(params[:query]).map(&:iupac_name)
          }
        when 'wellplate'
          {
            wellplate_name: Wellplate.by_name(params[:query]).pluck(:name),
            sample_name: Sample.with_wellplates.by_name(params[:query]).pluck(:name),
            iupac_name: Molecule.with_wellplates.by_iupac_name(params[:query]).map(&:iupac_name)
          }
        when 'screen'
          {
            screen_name: Screen.by_name(params[:query]).pluck(:name),
            conditions: Screen.by_conditions(params[:query]).pluck(:conditions),
            requirements: Screen.by_requirements(params[:query]).pluck(:requirements)
          }
        else
          {
            sample_name: Sample.by_name(params[:query]).pluck(:name),
            sum_formula: Molecule.by_formula(params[:query]).map(&:sum_formular),
            iupac_name: Molecule.by_iupac_name(params[:query]).map(&:iupac_name),
            reaction_name: Reaction.by_name(params[:query]).pluck(:name),
            wellplate_name: Wellplate.by_name(params[:query]).pluck(:name),
            screen_name: Screen.by_name(params[:query]).pluck(:name),
            conditions: Screen.by_conditions(params[:query]).pluck(:conditions),
            requirements: Screen.by_requirements(params[:query]).pluck(:requirements)
          }
        end
      end
    end

    resource :suggestions do

      namespace :all do
        desc 'Return all suggestions for AutoCompleteInput'
        params do
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            search_possibilities = search_possibilities_by_type('all')
            {suggestions: search_possibilities_to_suggestions(search_possibilities)}
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
            search_possibilities = search_possibilities_by_type('sample')
            {suggestions: search_possibilities_to_suggestions(search_possibilities)}
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
            search_possibilities = search_possibilities_by_type('reaction')
            {suggestions: search_possibilities_to_suggestions(search_possibilities)}
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
            search_possibilities = search_possibilities_by_type('wellplate')
            {suggestions: search_possibilities_to_suggestions(search_possibilities)}
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
            search_possibilities = search_possibilities_by_type('screen')
            {suggestions: search_possibilities_to_suggestions(search_possibilities)}
          end
        end
      end

    end
  end
end
