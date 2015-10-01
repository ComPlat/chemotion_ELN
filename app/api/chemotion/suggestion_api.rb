module Chemotion
  class SuggestionAPI < Grape::API
    resource :suggestions do

      namespace :samples do
        desc '...'
        params do
          requires :query, type: String, desc: 'Search query'
        end
        route_param :query do
          get do
            suggestions = []
            inchikeys = Molecule.by_formula(params[:query]).map(&:sum_formular)

            suggestions = inchikeys.map { |key| {name: key, endpoint: 'samples'} }

            p suggestions
            # -> nach suggestions Sample.search_by_inchikey(params[:query])
            {:suggestions => suggestions}
          end
        end
      end

    end
  end
end
