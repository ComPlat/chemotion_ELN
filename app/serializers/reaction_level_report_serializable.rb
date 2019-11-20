module ReactionLevelReportSerializable
  extend ActiveSupport::Concern

  included do
    attributes *DetailLevels::Reaction.new.report_base_attributes

    has_many :collections, through: :collections_reactions

    def temperature_display_with_unit
      object.temperature_display_with_unit
    end


    def literatures
      Literature.by_element_attributes_and_cat(id, 'Reaction', 'detail')
                .add_user_info
    end
  end
end
