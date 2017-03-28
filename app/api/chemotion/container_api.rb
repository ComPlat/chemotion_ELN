module Chemotion
  class ContainerAPI < Grape::API
    resource :tree do
      desc "Get data tree for collection"
      get ':collection_id' do
        c = Collection.belongs_to_or_shared_by(current_user.id,current_user.group_ids)
                  .find(params[:collection_id])
                  .samples
                  .includes(:container,
                            collections: :sync_collections_users)
        samples = c.map do |sample|
          {id: sample. id,
            title: sample.short_label,
          children: ContainerHelper.get_children(sample.container)
          }
        end


        attachments = Attachment.where(:container_id => nil, :created_for => current_user.id)
        data_tree = attachments.map do |attachment|
          titleStr = attachment.filename + " (attachment)"
          {id: attachment.id, title: titleStr, children: []}
        end
        tree = [{title: 'Measurement data', children: data_tree}]

        tree.concat(samples)
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
