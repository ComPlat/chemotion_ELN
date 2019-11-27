class ElementSerializer < ActiveModel::Serializer

  attributes *DetailLevels::Element.new.base_attributes

  has_one :container, serializer: ContainerSerializer
  has_one :element_klass

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end
  def updated_at
    object.updated_at.strftime("%d.%m.%Y, %H:%M")
  end

  def el_type
    object.element_klass.name
  end

  def type
    object.element_klass.name #'genericEl' #object.type
  end

  def is_restricted
    false
  end

  class Level0 < ActiveModel::Serializer
    include ElementLevelSerializable
    define_restricted_methods_for_level(0)
  end
end

class ElementSerializer::Level10 < ElementSerializer
  alias_method :original_initialize, :initialize
  def initialize(element, nested_detail_levels)
    original_initialize(element)
    @nested_dl = nested_detail_levels
  end
end
