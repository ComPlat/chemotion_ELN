module Chemotion
  class SuggestionAPI < Grape::API
    helpers do
      def search_possibilities_and_endpoint_to_suggestions(search_possibilities, endpoint)
        suggestions = []
        search_possibilities.each do |k,v|
          suggestions += v.map {|x| {name: x, search_by_method: k, endpoint: endpoint}}
        end
        suggestions
      end
    end

    resource :suggestions do

      namespace :samples do
        desc 'Return sample suggestions for AutoCompleteInput'
        params do
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            search_possibilities = {
              sample_name: Sample.by_name(params[:query]).pluck(:name),
              sum_formula: Molecule.by_formula(params[:query]).map(&:sum_formular)
            }

            {suggestions: search_possibilities_and_endpoint_to_suggestions(search_possibilities, 'samples')}
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
            search_possibilities = {
              reaction_name: Reaction.by_name(params[:query]).pluck(:name)
            }

            {suggestions: search_possibilities_and_endpoint_to_suggestions(search_possibilities, 'reactions')}
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
            search_possibilities = {
              wellplate_name: Wellplate.by_name(params[:query]).pluck(:name)
            }

            {suggestions: search_possibilities_and_endpoint_to_suggestions(search_possibilities, 'wellplates')}
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
            search_possibilities = {
              screen_name: Screen.by_name(params[:query]).pluck(:name)
            }

            {suggestions: search_possibilities_and_endpoint_to_suggestions(search_possibilities, 'screens')}
          end
        end
      end

    end
  end
end
