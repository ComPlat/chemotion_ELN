# frozen_string_literal: true

# == Schema Information
#
# Table name: collections_vessels
#
#  id            :uuid             not null, primary key
#  deleted_at    :datetime
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  collection_id :bigint
#  vessel_id     :uuid
#
# Indexes
#
#  index_collections_vessels_on_collection_id                (collection_id)
#  index_collections_vessels_on_deleted_at                   (deleted_at)
#  index_collections_vessels_on_vessel_id                    (vessel_id)
#  index_collections_vessels_on_vessel_id_and_collection_id  (vessel_id,collection_id) UNIQUE
#
require 'rails_helper'

RSpec.describe CollectionsVessel do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to belong_to(:collection) }
  it { is_expected.to belong_to(:vessel) }
end
