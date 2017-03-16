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
        result = c.map do |sample|
          {title: sample.short_label,
          children: ContainerHelper.get_children(sample.container)
          }
        end
      end

    end
  end
end
