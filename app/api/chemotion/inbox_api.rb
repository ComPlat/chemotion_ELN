module Chemotion
  class InboxAPI < Grape::API
    resource :inbox do
      resource :samples do
        desc 'search samples from user by '
        params do
          optional :search_string, type: String, desc: 'Search String'
        end
        get do
          # params[:search_string]
          # Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)

          Sample.limit(10)
        end
      end
    end
  end
end
