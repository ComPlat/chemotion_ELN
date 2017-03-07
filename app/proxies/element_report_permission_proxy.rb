class ElementReportPermissionProxy < ElementPermissionProxy

  private

  def serializer_class_by_element
    case element
    when Sample
      SampleReportSerializer
    when Reaction
      ReactionReportSerializer
    end
  end
end
