class ScreenSerializer < ActiveModel::Serializer
  include Labeled

  attributes :id, :type, :name, :description, :result, :collaborator, :conditions, :requirements, :created_at, :wellplates

  has_many :wellplates

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'screen'
  end
end
