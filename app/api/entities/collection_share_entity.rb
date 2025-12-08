# frozen_string_literal: true

module Entities
  class CollectionShareEntity < ApplicationEntity
    expose! :id
    expose! :collection_id
    expose! :shared_with
    expose! :shared_with_id
    expose! :shared_with_type
    expose! :permission_level # TODO: wie kommuniziert man sauber die Möglichkeiten die das FE freigeben soll?
    expose! :celllinesample_detail_level
    expose! :devicedescription_detail_level
    expose! :element_detail_level
    expose! :reaction_detail_level
    expose! :researchplan_detail_level
    expose! :sample_detail_level
    expose! :screen_detail_level
    expose! :sequencebasedmacromoleculesample_detail_level
    expose! :wellplate_detail_level

    def shared_with
      "#{object.shared_with.name} (#{object.shared_with.name_abbreviation})"
    end

    def shared_with_type
      object.shared_with.type
    end
  end
end
