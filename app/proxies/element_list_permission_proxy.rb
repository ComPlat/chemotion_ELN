class ElementListPermissionProxy < ElementPermissionProxy

  private

  def serializer_class_by_element
    case element
    when Sample
      SampleListSerializer
    when Reaction
     ReactionListSerializer
    when Wellplate
      WellplateListSerializer
    when Screen
      ScreenListSerializer
    when ResearchPlan
      ResearchPlanListSerializer
    when Element
      ElementListSerializer
    end
  end
end
