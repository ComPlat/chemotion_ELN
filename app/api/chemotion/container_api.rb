module Chemotion
  class ContainerAPI < Grape::API
    resource :tree do
      desc "Get data tree for collection"
      params do
        requires :type
      end
      #before do
      #  error!('401 Unauthorized', 401) unless current_user.collections.find(params[:collection_id])
      #end
      get ':collection_id' do
        ContainerTreeHelper.get_tree(current_user.id,current_user.group_ids,
        params[:collection_id], params[:type])
      end

      desc "Update data tree"
      params do
        requires :treeData, type: Array
      end
      #before do
      #  error!('401 Unauthorized', 401) unless current_user.collections.find(params[:currentCollectionId])
      #end
      put do
        ContainerTreeHelper.update_tree(current_user.id, current_user.group_ids,
        params[:collection_id], params[:type], params[:treeData])
      end

    end

    resource :inbox do
      get do
        attachments = Attachment.where(:container_id => nil, :created_for => current_user.id)

      end
    end

  end
end
