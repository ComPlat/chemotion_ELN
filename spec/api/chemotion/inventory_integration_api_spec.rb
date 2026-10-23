# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::InventoryIntegrationAPI do
  include_context 'api request authorization context'

  let(:collection) { create(:collection, user: user) }
  let(:path) { "/api/v1/inventory_integration/collections/#{collection.id}/field_access" }

  it 'tells the owner of an inventory collection the groups, levels and role defaults', :aggregate_failures do
    create(:inventory_managed_collection, collection: collection)
    get path
    body = response.parsed_body
    expect(body).to include('inventory' => true, 'own_access' => InventoryIntegration::FieldAccess::FULL)
    expect(body['groups'].first).to eq('key' => 'substance_safety', 'levels' => %w[read edit])
    expect(body['role_defaults']['collaborator']).to include('location' => 'hidden')
    expect(body['default_roles']).to include('0' => 'reviewer', '4' => 'supervisor')
  end

  it 'reports ordinary collections as no inventory' do
    get path
    expect(response.parsed_body).to include('inventory' => false, 'own_access' => nil)
  end

  it 'answers 404 to users who cannot manage the shares' do
    foreign = create(:collection, user: create(:person))
    create(:collection_share, collection: foreign, shared_with: user,
                              permission_level: CollectionShare.permission_level(:remove_elements))
    get "/api/v1/inventory_integration/collections/#{foreign.id}/field_access"
    expect(response).to have_http_status(:not_found)
  end
end
