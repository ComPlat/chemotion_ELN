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

  class Level0 < ActiveModel::Serializer
    attributes :id, :type, :is_restricted, :name, :description, :conditions, :requirements

    def type
      'screen'
    end

    def is_restricted
      true
    end
  end
end
