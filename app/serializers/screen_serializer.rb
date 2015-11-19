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

    has_many :wellplates

    alias_method :original_initialize, :initialize
    def initialize(element, nested_detail_levels)
      original_initialize(element)
      @nested_dl = nested_detail_levels
    end

    def wellplates
      object.wellplates.map{ |s| "WellplateSerializer::Level#{@nested_dl[:wellplate]}".constantize.new(s, @nested_dl).serializable_hash }
    end

    def type
      'screen'
    end

    def is_restricted
      true
    end
  end
end

class ScreenSerializer::Level10 < ScreenSerializer
  has_many :wellplates

  alias_method :original_initialize, :initialize
  def initialize(element, nested_detail_levels)
    original_initialize(element)
    @nested_dl = nested_detail_levels
  end

  def wellplates
    object.wellplates.map{ |s| "WellplateSerializer::Level#{@nested_dl[:wellplate]}".constantize.new(s, @nested_dl).serializable_hash }
  end
end
