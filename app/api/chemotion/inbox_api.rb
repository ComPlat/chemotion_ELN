module Chemotion
  class InboxAPI < Grape::API
    resource :inbox do
      resource :samples do
        desc 'search samples from user by'
        params do
          requires :search_string, type: String, desc: 'Search String'
        end
        get do
          search_string = params[:search_string]
          search_string.chomp!(File.extname(search_string))
          search_string.sub!(/-[A-Z]$/, '')
          search_string.sub!(/^[a-zA-Z0-9]+-/, '')

          # Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
          collection_ids =
            Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).map(&:id)
          Sample.by_name(search_string).select do |s|
            (s.collection_ids & collection_ids).present?
          end
        end

        desc 'assign analyses to sample'
        params do
          optional :analyses_id, type: Integer, desc: 'Analyses ID'
        end
        post ':sample_id' do
          {}
          # byebug
        end
      end
    end
  end
end
