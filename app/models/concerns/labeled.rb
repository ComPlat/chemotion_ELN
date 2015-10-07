module Labeled
  extend ActiveSupport::Concern

  included do
    attributes :collection_labels
  end

  def collection_labels
    collections = object.collections
    collections.map {|c| {name: c.label, is_shared: c.is_shared}}.uniq
  end
end
