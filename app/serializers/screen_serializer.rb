class ScreenSerializer < ActiveModel::Serializer
  attributes *DetailLevels::Screen.new.base_attributes

  has_many :wellplates
  has_many :research_plans
  has_one :container, serializer: ContainerSerializer
  has_one :tag

  def code_log
    CodeLogSerializer.new(object.code_log).serializable_hash
  end

  def created_at
    object.created_at.strftime("%d.%m.%Y, %H:%M")
  end
  def updated_at
    object.updated_at.strftime("%d.%m.%Y, %H:%M")
  end

  def type
    'screen'
  end

  class Level0 < ActiveModel::Serializer
    include ScreenLevelSerializable
    define_restricted_methods_for_level(0)
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

  def research_plans
    # TODO: set proper detail level
    # object.research_plans.map{ |s| "ResearchPlanSerializer::Level#{@nested_dl[:research_plan]}".constantize.new(s, @nested_dl).serializable_hash }
    object.research_plans.map{ |s| "ResearchPlanSerializer::Level#{@nested_dl[:wellplate]}".constantize.new(s, @nested_dl).serializable_hash }
  end
end
