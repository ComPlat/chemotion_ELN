# frozen_string_literal: true

require 'rails_helper'

describe VersionRevertPolicy do
  let(:user) { create(:person) }
  let(:other_user) { create(:person) }
  let(:own_collection) { create(:collection, user: user) }
  let(:other_collection) { create(:collection, user: other_user) }
  let(:own_sample) { create(:sample, collections: [own_collection]) }
  let(:other_sample) { create(:sample, collections: [other_collection]) }

  def change(record, *fields)
    {
      'klass_name' => record.class.name,
      'db_id' => record.id,
      'fields' => fields.map { |name, value| { 'name' => name, 'value' => value } },
    }
  end

  def allowed?(*changes)
    described_class.new(user, changes).allowed?
  end

  def shared_collection(permission_level)
    create(:collection, user: other_user).tap do |collection|
      create(:collection_share, collection: collection, shared_with: user,
                                permission_level: CollectionShare.permission_level(permission_level))
    end
  end

  it 'allows a revertible field of an element in an own collection' do
    expect(allowed?(change(own_sample, %w[name old]))).to be true
  end

  it 'allows a revertible field of an element shared with edit permission' do
    sample = create(:sample, collections: [shared_collection(:edit_elements)])
    expect(allowed?(change(sample, %w[name old]))).to be true
  end

  it 'requires edit permission on the element' do
    expect(allowed?(change(other_sample, %w[name old]))).to be false

    read_only = create(:sample, collections: [shared_collection(:read_elements)])
    expect(allowed?(change(read_only, %w[name old]))).to be false
  end

  it 'checks every change in the request' do
    expect(allowed?(change(other_sample, %w[name old]), change(own_sample, %w[name old]))).to be false
    expect(allowed?(change(own_sample, %w[name old]), change(other_sample, %w[name old]))).to be false
  end

  it 'only accepts fields the history offers for reverting' do
    expect(allowed?(change(own_sample, ['created_by', other_user.id]))).to be false
    expect(allowed?(change(own_sample, %w[name old], ['deleted_at', nil]))).to be false
  end

  it 'only accepts record types that have a reverter' do
    expect(allowed?({ 'klass_name' => 'User', 'db_id' => user.id, 'fields' => [] })).to be false
    expect(allowed?({ 'klass_name' => 'Sample', 'db_id' => 0, 'fields' => [] })).to be false
  end

  it 'requires a non-empty list of changes' do
    expect(described_class.new(user, []).allowed?).to be false
    expect(described_class.new(user, nil).allowed?).to be false
    expect(described_class.new(user, change(own_sample, %w[name old])).allowed?).to be false
  end

  def analysis_of(sample)
    sample.container.descendants.find_by(container_type: 'analysis')
  end

  it 'checks an analysis container against the element it belongs to' do
    expect(allowed?(change(analysis_of(own_sample), %w[name old]))).to be true
    expect(allowed?(change(analysis_of(other_sample), %w[name old]))).to be false
  end

  it 'checks a deleted analysis container against the element it belongs to, so it can be restored' do
    own_analysis = analysis_of(own_sample).tap(&:destroy)
    other_analysis = analysis_of(other_sample).tap(&:destroy)

    expect(allowed?(change(own_analysis, ['deleted_at', nil]))).to be true
    expect(allowed?(change(other_analysis, ['deleted_at', nil]))).to be false
  end

  it 'only accepts the containers the history shows (analyses and datasets)' do
    expect(allowed?(change(own_sample.container, ['deleted_at', Time.current.iso8601]))).to be false
    analyses = own_sample.container.children.find_by(container_type: 'analyses')
    expect(allowed?(change(analyses, %w[name old]))).to be false
  end

  it 'only accepts a stored image name when reverting a structure' do
    expect(allowed?(change(own_sample, ['sample_svg_file', "#{'a' * 128}.svg"]))).to be true
    expect(allowed?(change(own_sample, ['sample_svg_file', 'subfolder/structure.svg']))).to be false
  end

  it 'requires edit permission on both the reaction and the sample of a reaction material' do
    reaction = create(:reaction, collections: [own_collection])
    own_material = create(:reactions_sample, reaction: reaction, sample: own_sample)
    other_material = create(:reactions_sample, reaction: reaction, sample: other_sample)
    # Linking a sample to a reaction adds it to the reaction's collections; undo that for this case.
    other_sample.collections.delete(own_collection)

    expect(allowed?(change(own_material, ['coefficient', 2]))).to be true
    expect(allowed?(change(other_material, ['coefficient', 2]))).to be false
  end

  it 'does not revert whether a reaction material is removed' do
    reaction = create(:reaction, collections: [own_collection])
    material = create(:reactions_sample, reaction: reaction, sample: own_sample)

    expect(allowed?(change(material, ['deleted_at', nil]))).to be false
  end

  it 'requires read access to a sample placed into a well' do
    wellplate = create(:wellplate, collections: [own_collection])
    well = create(:well, wellplate: wellplate, sample: own_sample)

    expect(allowed?(change(well, ['sample_id', own_sample.id]))).to be true
    expect(allowed?(change(well, ['sample_id', nil]))).to be true
    expect(allowed?(change(well, ['sample_id', other_sample.id]))).to be false
  end
end
