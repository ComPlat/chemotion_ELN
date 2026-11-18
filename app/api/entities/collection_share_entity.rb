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

    # Both dereference the association unguarded, and may: collection_shares.shared_with_id has a
    # FK to users, so the row cannot outlive the account, and the association is declared
    # +with_deleted+ so a *soft*-deleted sharee still resolves. Before that, a deleted sharee made
    # this nil and every reader of the share 500ed. Keep them non-nil strings regardless — the
    # frontend's mobx model declares both as required types.string.
    def shared_with
      "#{object.shared_with.name} (#{object.shared_with.name_abbreviation})"
    end

    def shared_with_type
      object.shared_with.type
    end
  end
end
