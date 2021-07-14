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
          search_string.sub!(/-?[A-Z]$/, '')
          search_string.sub!(/^[a-zA-Z0-9]+-/, '')
          collection_ids = Collection.belongs_to_or_shared_by(current_user.id, current_user.group_ids).map(&:id)
          samples = Sample.by_exact_name(search_string).joins(:collections_samples).where('collections_samples.collection_id in (?)', collection_ids).uniq
          samples.select { |s| ElementPolicy.new(current_user, s).update? }
        end

        desc 'assign attachment to sample'
        params do
          optional :attachment_id, type: Integer, desc: 'Sample ID'
        end
        before do
          sample = Sample.find(params[:sample_id])
          error!('401 Unauthorized', 401) unless ElementPolicy.new(current_user, sample).update?
          attachment = Attachment.find(params[:attachment_id])
          error!('402 Unauthorized', 402) unless attachment.created_for == current_user.id
        end
        post ':sample_id' do
          analyses_container = Sample.find(params[:sample_id]).container.children.find_by(container_type: "analyses")
          attachment = Attachment.find(params[:attachment_id])
          analysis_name = attachment.filename.chomp(File.extname(attachment.filename))

          new_analysis_container = analyses_container.children.create(container_type: 'analysis', name: analysis_name)
          dataset = new_analysis_container.children.create(parent_id: new_analysis_container.id, container_type: 'dataset', name: analysis_name)
          attachment.update_attributes!(attachable: dataset)
          dataset
        end
      end
    end
  end
end
