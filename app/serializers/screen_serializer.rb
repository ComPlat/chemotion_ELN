class ScreenSerializer < ActiveModel::Serializer

  attributes :id, :type, :name, :description, :result, :collaborator, :conditions, :requirements, :created_at, :collection_labels, :wellplates

  has_many :wellplates

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def collection_labels
    object.collections.flat_map(&:label).uniq
  end

  def type
    'screen'
  end
end
