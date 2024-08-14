# frozen_string_literal: true

require 'rails_helper'

load 'db/migrate/20240709095242_rm_dup_collections_cellline.rb'
load 'db/migrate/20240709095243_add_index_to_collections_cellline.rb'

# rubocop:disable RSpec/DescribeClass
RSpec.describe 'migration 20240709095242: remove duplicate CollectionsCellline' do
  let(:collection) { create(:collection) }
  let(:collection2) { create(:collection) }
  let(:cellline) { create(:cellline_sample) }

  # timestamps: 1, 2 , 3 hours ago
  let(:time) { 2.hours.ago }
  let(:attributes) { { collection_id: collection.id, cellline_sample_id: cellline.id } }
  let(:attributes2) { { collection_id: collection2.id, cellline_sample_id: cellline.id } }
  let(:nextval) do
    CollectionsCellline.connection.execute(
      "SELECT nextval('collections_celllines_id_seq')",
    ).first.fetch('nextval')
  end

  context 'without adding unique index on collections_celllines[:cellline_sample_id, :collection_id]' do
    before do
      # reverse migration (remove indices) without changing the schema version
      AddIndexToCollectionsCellline.new.down
      CollectionsCellline.create(id: nextval + 1, **attributes, deleted_at: time)
      CollectionsCellline.create(id: nextval + 2, **attributes, deleted_at: nil)
      CollectionsCellline.create(id: nextval + 3, **attributes, deleted_at: time + 1.hour)
      CollectionsCellline.create(id: nextval + 4, **attributes2, deleted_at: time)
      CollectionsCellline.create(id: nextval + 5, **attributes2, deleted_at: time + 1.hour)

      # run migration to remove duplicates
      RmDupCollectionsCellline.new.up
    end

    after do
      # reintroduce the indices
      AddIndexToCollectionsCellline.new.up
    end

    # rubocop:disable RSpec/MultipleExpectations
    it 'has no duplicate CollectionsCellline records, and record kept is not-deleted if possible' do
      expect(CollectionsCellline.only_deleted.where(**attributes).count).to eq(0)
      expect(CollectionsCellline.where(**attributes).count).to eq(1)
      expect(CollectionsCellline.only_deleted.where(**attributes2).count).to eq(1)
      expect(CollectionsCellline.where(**attributes2).count).to eq(0)
    end
    # rubocop:enable RSpec/MultipleExpectations
  end
end
# rubocop:enable RSpec/DescribeClass
