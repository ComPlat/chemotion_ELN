# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ExtractSdsJob do
  let(:user) { create(:person) }
  let(:sample) { create(:sample) }
  let(:chemical) do
    Chemical.create!(
      sample_id: sample.id,
      chemical_data: [{ 'safetySheetPath' => [{ 'sds_key' => '/safety_sheets/merck/test.pdf' }] }],
    )
  end
  let(:file_path) { Rails.public_path.join('safety_sheets/merck/test.pdf').to_s }

  let(:extraction_result) do
    {
      'chemical_name' => 'Phenol',
      'cas_number' => '108-95-2',
      'signal_word' => 'Danger',
      'hazard_statements' => ['H301', 'H311'],
      'precautionary_statements' => ['P260'],
      'ghs_codes' => ['GHS06'],
      'properties' => { 'boiling_point' => '181.7 °C' },
    }
  end

  before do
    chemical # ensure it is persisted
    allow(File).to receive(:exist?).and_call_original
    allow(File).to receive(:exist?).with(file_path).and_return(true)
    # Stub phrase lookups so tests don't need JSON files on disk
    allow_any_instance_of(ExtractSdsJob).to receive(:hazard_phrases_lookup).and_return(
      'H301' => 'Toxic if swallowed',
      'H311' => 'Toxic in contact with skin',
    )
    allow_any_instance_of(ExtractSdsJob).to receive(:precautionary_phrases_lookup).and_return(
      'P260' => 'Do not breathe dust',
    )
    allow(Chemotion::ChemicalsService).to receive(:construct_pictograms).and_return(['ghs06.png'])
  end

  describe '#perform' do
    context 'when user has an LLM provider configured (SF-05 path)' do
      before do
        # Stub the resolver to succeed (provider available)
        allow(LlmProviderResolver).to receive(:resolve)
          .with(user: user, task_name: 'sds_extraction')
          .and_return(double('resolution'))

        # Stub PDF text extraction
        allow(SdsPdfTextExtractor).to receive(:extract).with(file_path).and_return('SDS text content')

        # Stub the task runner
        allow(LlmTaskRunner).to receive(:run).with(
          task_name: 'sds_extraction',
          user: user,
          context: 'SDS text content',
        ).and_return(extraction_result)
      end

      it 'calls LlmTaskRunner with extracted PDF text' do
        expect(LlmTaskRunner).to receive(:run).with(
          task_name: 'sds_extraction',
          user: user,
          context: 'SDS text content',
        ).and_return(extraction_result)

        described_class.new.perform(sample_id: sample.id, user_id: user.id)
      end

      # Legacy ai4chemotion assertion (re-enabled in a separate commit):
      # it 'does NOT call ai4chemotion service' do
      #   expect(Chemotion::Ai4ChemotionService).not_to receive(:extract_sds)
      #   described_class.new.perform(sample_id: sample.id, user_id: user.id)
      # end

      it 'updates the chemical record with extracted data' do
        described_class.new.perform(sample_id: sample.id, user_id: user.id)

        chemical.reload
        entry = chemical.chemical_data[0]
        expect(entry['ai4chemotion']['chemical_name']).to eq('Phenol')
        expect(entry['ai4chemotion']['cas_number']).to eq('108-95-2')
        expect(entry['extractedProperties']['boiling_point']).to eq('181.7 °C')
      end

      it 'sets success notification' do
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('info')
        expect(job.instance_variable_get(:@notification_action)).to eq('ElementActions.fetchSampleById')
      end
    end

    # Legacy ai4chemotion fallback path — disabled for now; re-enabled together
    # with lib/chemotion/ai4_chemotion_service.rb in a separate commit.
    #
    # context 'when no LLM provider is configured and ai4chemotion is available (legacy path)' do
    #   before do
    #     allow(LlmProviderResolver).to receive(:resolve)
    #       .with(user: user, task_name: 'sds_extraction')
    #       .and_raise(Errors::LlmNotConfiguredError)
    #
    #     submission = { 'job_id' => 'job-abc', 'status' => 'PENDING' }
    #     job_result = { 'status' => 'SUCCESS', 'result' => extraction_result }
    #
    #     allow(Chemotion::Ai4ChemotionService).to receive(:extract_sds).and_return(submission)
    #     allow_any_instance_of(ExtractSdsJob).to receive(:poll_until_complete).and_return(job_result)
    #   end
    #
    #   it 'calls ai4chemotion service' do
    #     expect(Chemotion::Ai4ChemotionService).to receive(:extract_sds)
    #       .with(file_path, sample_id: sample.id, vendor: anything)
    #       .and_return('job_id' => 'job-abc', 'status' => 'PENDING')
    #     described_class.new.perform(sample_id: sample.id, user_id: user.id)
    #   end
    #
    #   it 'does NOT call LlmTaskRunner' do
    #     expect(LlmTaskRunner).not_to receive(:run)
    #     described_class.new.perform(sample_id: sample.id, user_id: user.id)
    #   end
    #
    #   it 'updates the chemical record with extracted data' do
    #     described_class.new.perform(sample_id: sample.id, user_id: user.id)
    #
    #     chemical.reload
    #     expect(chemical.chemical_data[0]['ai4chemotion']['chemical_name']).to eq('Phenol')
    #   end
    # end

    context 'when no LLM provider is configured (no provider path)' do
      before do
        allow(LlmProviderResolver).to receive(:resolve)
          .with(user: user, task_name: 'sds_extraction')
          .and_raise(Errors::LlmNotConfiguredError)
      end

      it 'does NOT call LlmTaskRunner and sets an error notification' do
        expect(LlmTaskRunner).not_to receive(:run)
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('error')
        expect(job.instance_variable_get(:@notification_message)).to include('no LLM provider')
      end
    end

    context 'when no chemical record is found' do
      it 'sets error notification and returns early' do
        job = described_class.new
        job.perform(sample_id: 999_999, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('error')
        expect(job.instance_variable_get(:@notification_message)).to include('no chemical record')
      end
    end

    context 'when PDF text extraction raises an error' do
      before do
        allow(LlmProviderResolver).to receive(:resolve).and_return(double('resolution'))
        allow(SdsPdfTextExtractor).to receive(:extract)
          .and_raise(SdsPdfTextExtractor::ExtractionError, 'gs failed')
      end

      it 'sets error notification' do
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('error')
        expect(job.instance_variable_get(:@notification_message)).to include('gs failed')
      end
    end

    context 'when LlmTaskRunner raises LlmProviderError' do
      before do
        allow(LlmProviderResolver).to receive(:resolve).and_return(double('resolution'))
        allow(SdsPdfTextExtractor).to receive(:extract).and_return('SDS text')
        allow(LlmTaskRunner).to receive(:run)
          .and_raise(Errors::LlmProviderError, 'API timeout')
      end

      it 'sets error notification with provider error message' do
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('error')
        expect(job.instance_variable_get(:@notification_message)).to include('API timeout')
      end
    end
  end

  describe '#provider_path_available?' do
    let(:job) { described_class.new }

    it 'returns true when resolver succeeds' do
      allow(LlmProviderResolver).to receive(:resolve).and_return(double)
      expect(job.send(:provider_path_available?, user)).to be true
    end

    it 'returns false when resolver raises LlmNotConfiguredError' do
      allow(LlmProviderResolver).to receive(:resolve)
        .and_raise(Errors::LlmNotConfiguredError)
      expect(job.send(:provider_path_available?, user)).to be false
    end
  end
end
