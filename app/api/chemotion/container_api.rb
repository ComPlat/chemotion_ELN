module Chemotion
  class ContainerAPI < Grape::API
    resource :tree do
      desc "Get data tree for collection"
      params do
        requires :type
      end
      get ':collection_id' do
        case params[:type]
        when "sample"
          c = Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids)
                  .find(params[:collection_id])
                  .samples
                  .includes(:container,
                            collections: :sync_collections_users)
        when "reaction"
          c = Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids)
                    .find(params[:collection_id])
                    .reactions
                    .includes(:container,
                              collections: :sync_collections_users)
        when "wellplate"
          c = Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids)
                    .find(params[:collection_id])
                    .wellplates
                    .includes(:container,
                              collections: :sync_collections_users)
        when "screens"
          c = Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids)
                    .find(params[:collection_id])
                    .screens
                    .includes(:container,
                              collections: :sync_collections_users)
        else
          c = []
        end

        elements = c.map do |element|
          {id: element.id,
            title: element.short_label,
            children: ContainerHelper.get_children(element.container)
          }
        end

        attachments = Attachment.where(:container_id => nil, :created_for => current_user.id)
        data_tree = attachments.map do |attachment|
          titleStr = attachment.filename + " (attachment)"
          {id: attachment.id, title: titleStr, children: []}
        end
        tree = [{title: 'Measurement data', children: data_tree}]

        tree.concat(elements)
      end

      desc "Update data tree"
      params do
        requires :treeData, type: Array
      end
      put do
        ContainerHelper.update_attachments(params[:treeData])
      end

    end
  end
end
