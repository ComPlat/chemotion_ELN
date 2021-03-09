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

        desc 'assign attachment to sample'
        params do
          optional :attachment_id, type: Integer, desc: 'Sample ID'
        end
        post ':sample_id' do
          analyses_container = Sample.find(params[:sample_id]).container.children.find_by(container_type: "analyses")
          attachment = Attachment.find(params[:attachment_id])
          analysis_name = attachment.filename.chomp!(File.extname(attachment.filename))

          new_analysis_container = analyses_container.children.create(container_type: 'analysis', name: analysis_name)
          dataset = new_analysis_container.children.create(parent_id: new_analysis_container.id, container_type: 'dataset', name: analysis_name)
          attachment.update_attributes!(attachable: dataset)
          dataset
        end
      end
    end
  end
end
