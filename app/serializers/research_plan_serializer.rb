class ResearchPlanSerializer < ActiveModel::Serializer

  attributes *DetailLevels::ResearchPlan.new.base_attributes

  has_one :container, :serializer => ContainerSerializer

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end
  def updated_at
    object.updated_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'research_plan'
  end

  def is_restricted
    false
  end

  class Level0 < ActiveModel::Serializer
    include ResearchPlanLevelSerializable
    define_restricted_methods_for_level(0)
  end
end

class ResearchPlanSerializer::Level10 < ResearchPlanSerializer
  alias_method :original_initialize, :initialize
  def initialize(element, nested_detail_levels)
    original_initialize(element)
    @nested_dl = nested_detail_levels
  end
end
