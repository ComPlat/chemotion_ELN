module Labeled
  extend ActiveSupport::Concern

  included do
    attributes :collection_labels
  end

  def collection_labels
    collections = object.collections.where.not(label: 'All')
    collections.map {|c|
      collection_id =
        if c.is_synchronized
          SyncCollectionsUser.where(collection_id: c.id).first.id
        else
          c.id
        end

      {
        name: c.label, is_shared: c.is_shared, user_id: c.user_id,
        id: collection_id, shared_by_id: c.shared_by_id,
        is_synchronized: c.is_synchronized
      }
    }.uniq
  end
end
