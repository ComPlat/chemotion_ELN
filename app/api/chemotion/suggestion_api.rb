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

      def search_possibilities_by_type_and_user_id(type, user_id)
        case type
        when 'sample'
          {
            sample_name: Sample.for_user(user_id).by_name(params[:query]).pluck(:name).uniq,
            sum_formula: Molecule.for_user(user_id).by_formula(params[:query]).map(&:sum_formular).uniq,
            iupac_name: Molecule.for_user(user_id).by_iupac_name(params[:query]).map(&:iupac_name).uniq
          }
        when 'reaction'
          {
            reaction_name: Reaction.for_user(user_id).by_name(params[:query]).pluck(:name).uniq,
            sample_name: Sample.for_user(user_id).with_reactions.by_name(params[:query]).pluck(:name).uniq,
            iupac_name: Molecule.for_user(user_id).with_reactions.by_iupac_name(params[:query]).map(&:iupac_name).uniq
          }
        when 'wellplate'
          {
            wellplate_name: Wellplate.for_user(user_id).by_name(params[:query]).pluck(:name).uniq,
            sample_name: Sample.for_user(user_id).with_wellplates.by_name(params[:query]).pluck(:name).uniq,
            iupac_name: Molecule.for_user(user_id).with_wellplates.by_iupac_name(params[:query]).map(&:iupac_name).uniq
          }
        when 'screen'
          {
            screen_name: Screen.for_user(user_id).by_name(params[:query]).pluck(:name).uniq,
            conditions: Screen.for_user(user_id).by_conditions(params[:query]).pluck(:conditions).uniq,
            requirements: Screen.for_user(user_id).by_requirements(params[:query]).pluck(:requirements).uniq
          }
        else
          {
            sample_name: Sample.for_user(user_id).by_name(params[:query]).pluck(:name).uniq,
            sum_formula: Molecule.for_user(user_id).by_formula(params[:query]).map(&:sum_formular).uniq,
            iupac_name: Molecule.for_user(user_id).by_iupac_name(params[:query]).map(&:iupac_name).uniq,
            reaction_name: Reaction.for_user(user_id).by_name(params[:query]).pluck(:name).uniq,
            wellplate_name: Wellplate.for_user(user_id).by_name(params[:query]).pluck(:name).uniq,
            screen_name: Screen.for_user(user_id).by_name(params[:query]).pluck(:name).uniq,
            conditions: Screen.for_user(user_id).by_conditions(params[:query]).pluck(:conditions).uniq,
            requirements: Screen.for_user(user_id).by_requirements(params[:query]).pluck(:requirements).uniq
          }
        end
      end
    end

    resource :suggestions do

      namespace :all do
        desc 'Return all suggestions for AutoCompleteInput'
        params do
          requires :user_id, type: Integer, desc: 'Current user id'
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            search_possibilities = search_possibilities_by_type_and_user_id('all', params[:user_id])
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
            search_possibilities = search_possibilities_by_type_and_user_id('sample', params[:user_id])
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
            search_possibilities = search_possibilities_by_type_and_user_id('reaction', params[:user_id])
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
            search_possibilities = search_possibilities_by_type_and_user_id('wellplate', params[:user_id])
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
            search_possibilities = search_possibilities_by_type_and_user_id('screen', params[:user_id])
            {suggestions: search_possibilities_to_suggestions(search_possibilities)}
          end
        end
      end

    end
  end
end
