module Chemotion
  class SearchAPI < Grape::API
    # TODO replace with model-data
    foods = [
        {:name => 'Bread', :type => 'food', :id => 0},
        {:name => 'Beans', :type => 'food', :id => 1},
        {:name => 'Beer', :type => 'food', :id => 2},
        {:name => 'Bonsai', :type => 'food', :id => 3},
        {:name => 'Noodles', :type => 'food', :id => 4},
    ]
    resource :search do
      desc 'Return search results'
      params do
        requires :query, type: String, desc: 'Search query'
      end
      route_param :query do
        get do
          suggestions = foods.select { |food| food[:name].match(/#{params[:query]}/i) }
          {:suggestions => suggestions}
        end
      end
    end
  end
end
