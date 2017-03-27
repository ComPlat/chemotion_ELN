module ReactionLevelReportSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Reaction.new.report_base_attributes

    has_many :collections, through: :collections_reactions

    def temperature_display_with_unit
      object.temperature_display_with_unit
    end
  end
end
