# frozen_string_literal: true

require 'rails_helper'

describe InventoryIntegration::FieldAccess do
  let(:owner) { create(:person) }
  let(:collection) { create(:collection, user: owner) }
  let!(:inventory) { create(:inventory_managed_collection, collection: collection) }
  let(:sample) { create(:sample, creator: owner, collections: [collection]) }
  let(:member) { create(:person) }
  let(:hidden_location) { { 'stock' => 'edit', 'location' => 'hidden', 'notes' => 'read' } }

  def share(shared_with, level, access = nil)
    create(:collection_share, collection: collection, shared_with: shared_with,
                              permission_level: CollectionShare.permission_level(level), inventory_field_access: access)
  end

  it 'does not apply to samples outside inventory collections' do
    other = create(:sample, creator: owner)
    expect(described_class.for(member, other)).to be_nil
  end

  it 'gives the owner and admins everything' do
    expect(described_class.for(owner, sample)).to eq described_class::FULL
    expect(described_class.for(create(:admin), sample)).to eq described_class::FULL
  end

  it 'uses the role default of the permission level for a share without its own map' do
    share(member, :edit_elements)
    expect(described_class.for(member, sample)).to eq described_class::ROLE_DEFAULTS['partner']
  end

  it 'takes the most permissive grant over direct and group shares' do
    share(member, :edit_elements, hidden_location)
    share(create(:group, users: [member]), :read_elements, 'location' => 'read', 'people' => 'read')
    expect(described_class.for(member, sample)).to include(
      'stock' => 'edit', 'location' => 'read', 'people' => 'read', 'notes' => 'read', 'procurement' => 'hidden',
    )
  end

  it 'turns edit into read below edit_elements' do
    share(member, :read_elements, hidden_location)
    expect(described_class.for(member, sample)).to include('stock' => 'read', 'location' => 'hidden')
  end

  it 'turns edit into read for groups the external system owns, also for the owner' do
    create(:inventory_connection, managed_collection: inventory, field_authority: { 'stock' => 'external' })
    share(member, :edit_elements, hidden_location)
    expect(described_class.for(member, sample)['stock']).to eq 'read'
    expect(described_class.for(owner, sample)).to include('stock' => 'read', 'location' => 'edit')
  end

  it 'hides groups a share leaves out, except the safety group' do
    share(member, :edit_elements, 'stock' => 'edit')
    expect(described_class.for(member, sample)).to include('substance_safety' => 'read', 'location' => 'hidden')
  end

  it 'does not lift restrictions through other collections holding the sample' do
    share(member, :edit_elements, hidden_location)
    CollectionsSample.insert_in_collection([sample.id], [create(:collection, user: member).id])
    elsewhere = create(:collection, user: create(:person))
    CollectionsSample.insert_in_collection([sample.id], [elsewhere.id])
    create(:collection_share, collection: elsewhere, shared_with: member,
                              permission_level: CollectionShare.permission_level(:manage_shares))
    expect(described_class.for(member, sample)['location']).to eq 'hidden'
  end

  it 'validates maps given for a share' do
    expect(described_class.errors('stock' => 'edit')).to be_empty
    expect(described_class.errors('substance_safety' => 'hidden', 'colour' => 'read', 'people' => 'edit')).to eq [
      'substance_safety must be one of read, edit', "unknown field group 'colour'", 'people must be one of hidden, read'
    ]
    expect(described_class.errors('edit')).to eq ['must be a mapping of field groups to levels']
  end

  it 'assigns inventory keys to their groups' do
    groups = %w[host_room merckProductInfo merck_link amount person important_notes unknown_key]
             .map { |key| described_class.group_of(key) }
    expect(groups).to eq ['location', 'procurement', 'substance_safety', 'stock', 'people', 'notes', nil]
  end
end
