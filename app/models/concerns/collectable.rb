module Collectable
  extend ActiveSupport::Concern

  included do
    scope :by_collection_id, ->(id) { joins(:collections).where('collections.id = ?', id) }
    scope :search_by, ->(search_by_method, arg) { public_send("search_by_#{search_by_method}", arg) }
  end
end
