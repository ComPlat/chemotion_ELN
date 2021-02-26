module Chemotion
  class InboxAPI < Grape::API
    resource :inbox do
      resource :samples do
        desc 'search samples from user by '
        params do
          requires :search_string, type: String, desc: 'Search String'
        end
        get do
          # Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids)
          collection_ids =
            Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).map(&:id)
          Sample.by_name(params[:search_string]).select do |s|
            (s.collection_ids & collection_ids).present?
          end
        end
      end
    end
  end
end
