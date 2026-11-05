# frozen_string_literal: true

require 'rails_helper'

# Tests that verify the composition table data persists and is returned correctly
# across the full backend round-trip for HierarchicalMaterial samples.
#
# Root causes for empty composition table that these tests pin:
#   - HM components built from Ketcher text nodes have no molecule_id. The old validator
#     required molecule_id unconditionally → 422 on save → data only in JS state → gone on reload.
#   - component.name must equal 'HierarchicalMaterial' (JS filter in sampleHierarchicalCompositions.js)
#   - component_properties.source must be non-empty (JS filter on parseComponentSource)
#   - Components must survive a sample edit (PUT /samples/:id must not wipe component rows)
#
describe Chemotion::ComponentAPI do
  include_context 'api request authorization context'

  let!(:hm_sample) do
    create(:valid_sample, creator: user,
                          sample_type: Sample::SAMPLE_TYPE_HIERARCHICAL_MATERIAL,
                          collections: [create(:collection, user_id: user.id)])
  end
  let!(:molecule_a) { create(:molecule) }
  let!(:molecule_b) { create(:molecule) }

  # HM components from postComponents() in StructureEditorModal.js have no molecule_id.
  def hm_ketcher_component(source:, name: 'HierarchicalMaterial', id: 'new_1', position: 1)
    {
      id: id,
      name: name,
      position: position,
      component_properties: {
        source: source,
        molar_mass: 0.0,
        weight_ratio_exp: 0.0,
        template_category: 'semantic',
      },
    }
  end

  # Helper for components that do have a molecule (e.g. Mixture components)
  def hm_component_params(molecule:, source:, name: 'HierarchicalMaterial', id: 'new_1', position: 1)
    {
      id: id,
      name: name,
      position: position,
      component_properties: {
        molecule_id: molecule.id,
        source: source,
        molar_mass: 300.0,
        weight_ratio_exp: 10.0,
        template_category: 'semantic',
      },
    }
  end

  # Regression: HM components built by postComponents() in StructureEditorModal.js
  # have no molecule_id. The validator previously rejected these with 422, causing
  # a silent save failure — data showed in the UI (JS state) but vanished on reload.
  it 'saves an HM component that has no molecule_id (Ketcher text-node component)' do
    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [hm_ketcher_component(source: '1wt% PtPd')],
        },
        as: :json

    expect(response).to have_http_status(:ok)
    expect(Component.where(sample_id: hm_sample.id).count).to eq(1)
    saved = Component.find_by(sample_id: hm_sample.id)
    expect(saved.component_properties['source']).to eq('1wt% PtPd')
    expect(saved.component_properties['molecule_id']).to be_nil
  end

  # TC1: basic round-trip — PUT saves component, GET retrieves it with source intact
  it 'TC1: round-trip — component saved with source is returned by GET' do
    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [hm_ketcher_component(source: '10% PtPd')],
        },
        as: :json

    expect(response).to have_http_status(:ok)

    get "/api/v1/components/#{hm_sample.id}"
    parsed = JSON.parse(response.body)

    expect(parsed.length).to eq(1)
    expect(parsed.first['name']).to eq('HierarchicalMaterial')
    expect(parsed.first.dig('component_properties', 'source')).to eq('10% PtPd')
  end

  # TC2: component name requirement — name='HierarchicalMaterial' is stored and returned verbatim
  # (the JS layer filters out anything else; storing the wrong name = invisible row)
  it 'TC2: stores the component name exactly as sent — wrong name means invisible table row' do
    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [hm_component_params(molecule: molecule_a, source: '10% PtPd', name: 'SomethingElse')],
        },
        as: :json

    expect(response).to have_http_status(:ok)
    stored_name = Component.find_by(sample_id: hm_sample.id)&.name
    expect(stored_name).to eq('SomethingElse')
    # The JS filter `name !== 'HierarchicalMaterial'` would skip this row in the UI
  end

  # TC3: source requirement — component without source is saved but would not appear in table
  it 'TC3: accepts a component with no source but documents it will not appear in the composition table' do
    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [hm_ketcher_component(source: nil)],
        },
        as: :json

    expect(response).to have_http_status(:ok)

    get "/api/v1/components/#{hm_sample.id}"
    parsed = JSON.parse(response.body)
    # Component is persisted but source is nil — JS parseComponentSource returns empty compContent
    # and the row is filtered out client-side
    expect(parsed.first.dig('component_properties', 'source')).to be_nil
  end

  # TC4: multiple components all persist and are returned
  it 'TC4: persists all components when multiple are saved in one PUT' do
    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [
            hm_ketcher_component(source: '10% PtPd', id: 'new_1', position: 1),
            hm_ketcher_component(source: '90% support', id: 'new_2', position: 2),
          ],
        },
        as: :json

    expect(response).to have_http_status(:ok)

    get "/api/v1/components/#{hm_sample.id}"
    parsed = JSON.parse(response.body)
    sources = parsed.map { |c| c.dig('component_properties', 'source') }
    expect(sources).to contain_exactly('10% PtPd', '90% support')
  end

  # TC5: components survive a sample edit — PUT /samples/:id must not delete component rows
  it 'TC5: components are not wiped when the parent sample is updated via PUT /api/v1/samples/:id' do
    # First persist two components (no molecule — real Ketcher flow)
    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [
            hm_ketcher_component(source: '10% PtPd', id: 'new_1', position: 1),
            hm_ketcher_component(source: '90% support', id: 'new_2', position: 2),
          ],
        },
        as: :json
    expect(response).to have_http_status(:ok)
    expect(Component.where(sample_id: hm_sample.id).count).to eq(2)

    # Now update the sample (name change, unrelated to components)
    put "/api/v1/samples/#{hm_sample.id}",
        params: {
          name: 'Updated HM sample',
          target_amount_value: 0,
          target_amount_unit: 'g',
          molarity_value: nil,
          molarity_unit: 'M',
          description: '',
          purity: 1,
          solvent: '',
          location: '',
          molfile: '',
          is_top_secret: false,
          container: { attachments: [], children: [], is_new: true, is_deleted: false, name: 'new' },
          collection_id: hm_sample.collections.first.id,
        },
        as: :json
    expect(response).to have_http_status(:ok)

    # Components must still be there
    expect(Component.where(sample_id: hm_sample.id).count).to eq(2)
    get "/api/v1/components/#{hm_sample.id}"
    expect(JSON.parse(response.body).length).to eq(2)
  end

  # TC6: clearing all components — empty PUT replaces existing rows with nothing
  it 'TC6: an empty components array in PUT removes all existing component rows' do
    create(:component, sample: hm_sample, name: 'HierarchicalMaterial',
                       component_properties: { 'source' => '10% PtPd' })

    put '/api/v1/components',
        params: { sample_id: hm_sample.id, components: [] },
        as: :json

    expect(response).to have_http_status(:ok)
    expect(Component.where(sample_id: hm_sample.id).count).to eq(0)
  end

  # TC7: editing one component (by integer id) keeps the other untouched
  it 'TC7: updating one component by id leaves the other component unchanged' do
    comp_a = create(:component, sample: hm_sample, name: 'HierarchicalMaterial', position: 1,
                                component_properties: { 'source' => '10% PtPd' })
    comp_b = create(:component, sample: hm_sample, name: 'HierarchicalMaterial', position: 2,
                                component_properties: { 'source' => '90% support' })

    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [
            { id: comp_a.id, name: 'HierarchicalMaterial', position: 1,
              component_properties: { source: '15% PtPd' } },
            { id: comp_b.id, name: 'HierarchicalMaterial', position: 2,
              component_properties: { source: '90% support' } },
          ],
        },
        as: :json

    expect(response).to have_http_status(:ok)
    expect(comp_a.reload.component_properties['source']).to eq('15% PtPd')
    expect(comp_b.reload.component_properties['source']).to eq('90% support')
  end

  # TC8: removing one component while keeping the other (drop-from-payload pattern)
  it 'TC8: component omitted from PUT payload is deleted; kept component survives' do
    comp_a = create(:component, sample: hm_sample, name: 'HierarchicalMaterial', position: 1,
                                component_properties: { 'source' => '10% PtPd' })
    create(:component, sample: hm_sample, name: 'HierarchicalMaterial', position: 2,
                       component_properties: { 'source' => '90% support' })

    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [
            { id: comp_a.id, name: 'HierarchicalMaterial', position: 1,
              component_properties: { source: '10% PtPd' } },
          ],
        },
        as: :json

    expect(response).to have_http_status(:ok)
    expect(Component.where(sample_id: hm_sample.id).count).to eq(1)
    expect(Component.find(comp_a.id).component_properties['source']).to eq('10% PtPd')
  end

  # TC9: placeholder id creates a new component — no duplicate rows from repeated new-id saves
  it 'TC9: placeholder string ids create new DB rows; subsequent saves with the real id do not duplicate' do
    # First save: id is a placeholder string (Ketcher component, no molecule)
    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [hm_ketcher_component(source: '10% PtPd', id: 'new_1')],
        },
        as: :json
    expect(response).to have_http_status(:ok)
    real_id = JSON.parse(response.body).first['id']

    # Second save: use the real integer id returned from the first save
    put '/api/v1/components',
        params: {
          sample_id: hm_sample.id,
          components: [
            { id: real_id, name: 'HierarchicalMaterial', position: 1,
              component_properties: { source: '10% PtPd' } },
          ],
        },
        as: :json
    expect(response).to have_http_status(:ok)
    expect(Component.where(sample_id: hm_sample.id).count).to eq(1)
  end

  # TC10: GET /api/v1/samples/:id.json returns a non-empty components array when components exist
  # (the SampleEntity exposes :components for HM samples; if it returns [] the UI table is always empty)
  it 'TC10: GET /api/v1/samples/:id.json includes saved components in the response' do
    create(:component, sample: hm_sample, name: 'HierarchicalMaterial', position: 1,
                       component_properties: { 'molecule_id' => molecule_a.id, 'source' => '10% PtPd' })

    get "/api/v1/samples/#{hm_sample.id}.json"

    expect(response).to have_http_status(:ok)
    sample_data = JSON.parse(response.body)['sample']
    expect(sample_data['components'].length).to be >= 1
    expect(sample_data['components'].first['name']).to eq('HierarchicalMaterial')
  end
end
