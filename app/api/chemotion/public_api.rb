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

      namespace :uploader do
        desc "Upload files"
        params do
          requires :recipient_email, type: String
          requires :subject, type: String
        end
        post do


          params.each do |file_id, file|
            puts params[1]
          end
          true
        end
      end
    end
  end
end
