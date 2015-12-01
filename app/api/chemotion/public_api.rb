module Chemotion
  class PublicAPI < Grape::API
    namespace :public do
      before do
        error!('Unauthorized' , 401) unless TokenAuthentication.new(request).is_successful?
      end

      resources :samples do
        desc "Return samples of all chemotion.net collections"

        get do
          Collection.for_publication.flat_map(&:samples).uniq
        end
      end

      # TODO further resources?

    end
  end
end
