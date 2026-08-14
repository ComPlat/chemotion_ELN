# frozen_string_literal: true

# rubocop:disable RSpec/AnyInstance -- the object under test is built inside the code path

require 'rails_helper'

RSpec.describe Usecases::Containers::UpdateDatamodel do
  let(:user)   { create(:person) }
  let!(:root_container)     { create(:container, container_type: 'root') }
  let!(:analysis_container) { create(:analysis_container, parent: root_container) }
  let(:usecase) { described_class.new(user) }

  # can_update_container? checks ElementPolicy on the root container's
  # containable — stub it so this stays a focused unit test of the
  # extended_metadata serialisation, not an authorisation test.
  before { allow_any_instance_of(described_class).to receive(:can_update_container?).and_return(true) }

  def update!(extended_metadata)
    container_params = {
      id: root_container.id,
      is_new: false,
      children: [
        {
          id: analysis_container.id,
          is_new: false,
          container_type: 'analysis',
          name: analysis_container.name,
          description: analysis_container.description,
          extended_metadata: extended_metadata,
          attachments: [],
        }.with_indifferent_access,
      ],
    }.with_indifferent_access

    usecase.update_datamodel(container_params)
  end

  describe 'ai_spectral_data (spectral extraction result)' do
    let(:payload) do
      {
        'technique' => 'nmr', 'technique_label' => '1H NMR', 'model' => 'kit.qwen3.5-397b-A17b',
        'result' => { 'nucleus' => '1H', 'signals' => [{ 'shift_ppm' => 7.26 }] }
      }
    end

    it 'serialises the Hash to a JSON string before persisting (hstore only stores flat strings)' do
      update!({ 'kind' => 'NMR', 'ai_spectral_data' => payload })

      raw = analysis_container.reload.extended_metadata['ai_spectral_data']
      expect(raw).to be_a(String)
      expect(JSON.parse(raw)).to eq(payload)
    end

    it 'round-trips through ContainerEntity back into a Hash' do
      update!({ 'kind' => 'NMR', 'ai_spectral_data' => payload })

      represented = Entities::ContainerEntity.represent(analysis_container.reload)
      hash = represented.serializable_hash
      expect(hash[:extended_metadata][:ai_spectral_data]).to eq(payload)
    end

    it 'does not choke when ai_spectral_data is absent' do
      expect { update!({ 'kind' => 'NMR' }) }.not_to raise_error
      expect(analysis_container.reload.extended_metadata['ai_spectral_data']).to be_nil
    end
  end

  describe 'content and general_description (pre-existing behaviour, regression check)' do
    it 'still JSON-serialises content for analysis containers' do
      update!({ 'content' => { 'ops' => [{ 'insert' => 'hello' }] } })

      raw = analysis_container.reload.extended_metadata['content']
      expect(JSON.parse(raw)).to eq('ops' => [{ 'insert' => 'hello' }])
    end
  end
end
# rubocop:enable RSpec/AnyInstance
