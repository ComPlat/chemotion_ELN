# frozen_string_literal: true

require 'rails_helper'

RSpec.describe StructureSpectralDataJob, active_job: true do
  let(:user) { create(:person) }
  let(:container) do
    create(:analysis_container, extended_metadata: {
             'kind' => 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)',
             'content' => '{"ops":[{"insert":"13C NMR (100 MHz, CDCl3) δ = 164.4."}]}',
           })
  end

  let(:service_result) do
    SpectralExtractionService::Result.new(
      technique: 'nmr', technique_label: '13C NMR', nucleus: '13C',
      model: 'kit.qwen3.5-397b-A17b', requested_model: nil,
      data: { 'nucleus' => '13C', 'signals' => [{ 'shift_ppm' => 164.4 }] },
    )
  end

  describe '#perform' do
    context 'when structuring succeeds' do
      before do
        allow(SpectralExtractionService).to receive(:call)
          .with(user: user, content: '{"ops":[{"insert":"13C NMR (100 MHz, CDCl3) δ = 164.4."}]}',
                kind: 'CHMO:0000595 | 13C nuclear magnetic resonance spectroscopy (13C NMR)')
          .and_return(service_result)
      end

      it 'persists the result into the container as a JSON string (hstore-safe)' do
        described_class.new.perform(container_id: container.id, user_id: user.id)

        raw = container.reload.extended_metadata['ai_spectral_data']
        expect(raw).to be_a(String)
        parsed = JSON.parse(raw)
        expect(parsed['technique']).to eq('nmr')
        expect(parsed['model']).to eq('kit.qwen3.5-397b-A17b')
        expect(parsed['result']).to eq('nucleus' => '13C', 'signals' => [{ 'shift_ppm' => 164.4 }])
        expect(parsed['extracted_at']).to be_present
      end

      it 'makes the persisted result readable via ContainerEntity' do
        described_class.new.perform(container_id: container.id, user_id: user.id)

        hash = Entities::ContainerEntity.represent(container.reload).serializable_hash
        expect(hash[:extended_metadata][:ai_spectral_data]['technique']).to eq('nmr')
      end

      it 'sets a success notification' do
        job = described_class.new
        job.perform(container_id: container.id, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('info')
      end

      it 'clears any previous failure marker' do
        container.update!(extended_metadata: container.extended_metadata.merge(
          'ai_spectral_extraction_error' => { 'message' => 'old failure' }.to_json,
        ))

        described_class.new.perform(container_id: container.id, user_id: user.id)
        expect(container.reload.extended_metadata['ai_spectral_extraction_error']).to be_nil
      end
    end

    context 'when the container does not exist' do
      it 'sets an error notification and does not raise' do
        job = described_class.new
        expect { job.perform(container_id: -1, user_id: user.id) }.not_to raise_error
        expect(job.instance_variable_get(:@notification_level)).to eq('error')
        expect(job.instance_variable_get(:@notification_message)).to include('not found')
      end
    end

    context 'when the LLM provider is not configured' do
      before do
        allow(SpectralExtractionService).to receive(:call)
          .and_raise(Errors::LlmNotConfiguredError, 'No LLM provider configured.')
      end

      it 'sets an error notification with the provider message' do
        job = described_class.new
        job.perform(container_id: container.id, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('error')
        expect(job.instance_variable_get(:@notification_message)).to include('No LLM provider configured')
      end

      it 'writes a failure marker via after_perform when run through the full ActiveJob lifecycle' do
        # Stub the notification call — generate_notifications() is a PG function
        # this test DB doesn't have loaded; irrelevant to what this test checks
        # (that after_perform's persist_extraction_failure ran).
        allow(Message).to receive(:create_msg_notification)

        perform_enqueued_jobs do
          described_class.perform_later(container_id: container.id, user_id: user.id)
        end

        raw = container.reload.extended_metadata['ai_spectral_extraction_error']
        expect(raw).to be_present
        expect(JSON.parse(raw)['message']).to include('No LLM provider configured')
      end
    end
  end
end
