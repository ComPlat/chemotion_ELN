# frozen_string_literal: true

require 'spec_helper'

shared_examples_for 'taggable_element_before_and_after_create' do
  let(:model) { described_class }
  let(:inst) { build(('valid_' + model.to_s.underscore).to_sym) }
  it 'has no tag before creation' do
    expect(inst.tag).to be_nil
  end
  it 'has a ElementTag after creation' do
    expect(inst.save! && inst.reload && inst.tag).to be_a ElementTag
  end
  it 'has taggable_data after creation' do
    expect(inst.save! && inst.reload && inst.tag.taggable_data).to be_a Hash
  end
end

shared_examples_for 'taggable_element_before_and_after_collection_update' do
  let(:model) { described_class }
  let(:inst) { create(('valid_' + model.to_s.underscore).to_sym) }
  let(:coll) { create(:collection) }

  it 'has a tag' do
    expect(inst.tag).to be_a ElementTag
  end
  it 'has taggable_data' do
    expect(inst.save! && inst.reload && inst.tag.taggable_data).to be_a Hash
  end

  it 'updates the collection tag' do
    expect(
      inst.collections << coll && inst.save! && inst.reload &&
      inst.tag.taggable_data['collection_labels']
    ).to include(
      'name' => coll.label, 'is_shared' => false, 'user_id' => coll.user_id,
      'id' => coll.id, 'shared_by_id' => nil, 'is_synchronized' => false
    )
  end
end

shared_examples_for 'taggable_element_before_and_after_analyses_update' do
  let(:model) { described_class }
  let(:inst) { create(('valid_' + model.to_s.underscore).to_sym) }
  let(:new_analysis) do
    create(
      :analysis_container,
      extended_metadata: { 'kind' => 'dummy kind', 'status' => 'Unconfirmed' }
    )
  end

  it 'has taggable_data' do
    expect(inst.save! && inst.reload && inst.tag.taggable_data).to be_a Hash
  end

  it 'updates the collection tag' do
    # TODO: the way of adding an analysis is cumbersome
    expect(
      inst.analyses.first.parent.children << new_analysis && inst.save! &&
      inst.reload && inst.tag.taggable_data['analyses']['unconfirmed']
    ).to include('dummy kind' => 1)
  end
end

shared_examples_for 'taggable_reaction_sample_before_and_after_update' do
  let(:inst) { create(:valid_sample) }
  let(:reaction) { build(:valid_reaction, products: [inst]) }
  it 'has a tag' do
    expect(inst.tag).to be_a ElementTag
  end

  it 'updates the reaction tag' do
    expect(
      reaction.save! && inst.reload && inst.tag.taggable_data['reaction_id']
    ).to eq(reaction.id)
  end
end
