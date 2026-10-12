# frozen_string_literal: true

# rubocop:disable RSpec/AnyInstance -- the object under test is built inside the code path
# rubocop:disable RSpec/MessageSpies -- reads better as an expectation set before the call

require 'rails_helper'

RSpec.describe ExtractSdsJob do
  let(:user) { create(:person) }
  # The job drives LlmTaskRunner through its *instance* API, because it needs
  # `model_used` / `requested_model` afterwards to record which model produced the
  # data. An instance_double keeps that contract verified.
  let(:runner) do
    instance_double(
      LlmTaskRunner,
      run:             extraction_result,
      model_used:      'kit.qwen3.5-397b-A17b',
      requested_model: nil,
      fell_back?:      false,
      resolution:      resolution,
    )
  end
  let(:resolution) do
    LlmProviderResolver::LlmResolution.new(
      provider: nil,
      model:    'kit.qwen3.5-397b-A17b',
      api_key:  'sk-test',
      base_url: 'https://ki-toolbox.scc.kit.edu/api',
      protocol: 'openai',
    )
  end
  let(:sample) { create(:sample, collections: [create(:collection, user_id: user.id)]) }
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
      'hazard_statements' => %w[H301 H311],
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
    allow_any_instance_of(described_class).to receive(:hazard_phrases_lookup).and_return(
      'H301' => 'Toxic if swallowed',
      'H311' => 'Toxic in contact with skin',
    )
    allow_any_instance_of(described_class).to receive(:precautionary_phrases_lookup).and_return(
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
          .and_return(resolution)

        # Stub PDF text extraction
        allow(SdsPdfTextExtractor).to receive(:extract).with(file_path).and_return('SDS text content')

        # Stub the task runner
        allow(LlmTaskRunner).to receive(:new).with(
          task_name: 'sds_extraction',
          user:      user,
          context:   'SDS text content',
        ).and_return(runner)
      end

      it 'calls LlmTaskRunner with extracted PDF text' do
        described_class.new.perform(sample_id: sample.id, user_id: user.id)

        expect(LlmTaskRunner).to have_received(:new).with(
          task_name: 'sds_extraction',
          user:      user,
          context:   'SDS text content',
        )
      end

      it 'reads the sheet it is given rather than the last saved one' do
        other = Rails.public_path.join('safety_sheets/merck/other.pdf').to_s
        allow(File).to receive(:exist?).with(other).and_return(true)
        allow(SdsPdfTextExtractor).to receive(:extract).with(other).and_return('SDS text content')

        described_class.new.perform(sample_id: sample.id, user_id: user.id,
                                    sheet_path: '/safety_sheets/merck/other.pdf')

        expect(SdsPdfTextExtractor).to have_received(:extract).with(other)
      end

      it 'refuses a given sheet outside the safety sheets folder' do
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id, sheet_path: '/safety_sheets/../../config/database.yml')

        expect(job.instance_variable_get(:@notification_message)).to include('no SDS file found')
      end

      it 'updates the chemical record with extracted data' do
        described_class.new.perform(sample_id: sample.id, user_id: user.id)

        chemical.reload
        entry = chemical.chemical_data[0]
        expect(entry['aiExtraction']['chemical_name']).to eq('Phenol')
        expect(entry['aiExtraction']['cas_number']).to eq('108-95-2')
        expect(entry['extractedProperties']['boiling_point']).to eq('181.7 °C')
      end

      it 'extracts once and notifies once when the same job is executed twice' do
        first  = described_class.new(sample_id: sample.id, user_id: user.id)
        second = described_class.new(sample_id: sample.id, user_id: user.id)
        second.job_id = first.job_id

        expect do
          first.perform_now
          second.perform_now
        end.to change(Message, :count).by(1)
        expect(LlmTaskRunner).to have_received(:new).once
      end

      # Checked while the run is in flight, not afterwards: the success path drops
      # the marker too, so only a mid-run read shows that the claim did it.
      it 'clears an earlier failure marker when it claims the extraction' do
        data = chemical.chemical_data.deep_dup
        data[0]['extraction_error'] = { 'message' => 'old failure', 'failed_at' => '2026-01-01T00:00:00Z' }
        chemical.update!(chemical_data: data)

        marker_during_run = 'unread'
        allow(runner).to receive(:run) do
          marker_during_run = chemical.reload.chemical_data[0]['extraction_error']
          extraction_result
        end

        described_class.new.perform(sample_id: sample.id, user_id: user.id)

        expect(marker_during_run).to be_nil
      end

      it 'sets success notification' do
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('info')
        expect(job.instance_variable_get(:@notification_action)).to eq('ElementActions.fetchSampleById')
      end
    end

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
        allow(LlmProviderResolver).to receive(:resolve).and_return(resolution)
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

    context 'when a newer extraction claims the sample mid-run' do
      before do
        allow(LlmProviderResolver).to receive(:resolve).and_return(resolution)
        allow(SdsPdfTextExtractor).to receive(:extract).and_return('SDS text')
        allow(LlmTaskRunner).to receive(:new).and_return(runner)
        allow(runner).to receive(:run) do
          data = chemical.reload.chemical_data.deep_dup
          data[0]['extraction_run'] = { 'token' => 'newer-run', 'started_at' => Time.current.iso8601 }
          chemical.update_columns(chemical_data: data) # rubocop:disable Rails/SkipsModelValidations
          raise Errors::LlmProviderError, 'API timeout'
        end
      end

      it 'notifies nobody and leaves no failure marker' do
        expect { described_class.perform_now(sample_id: sample.id, user_id: user.id) }
          .not_to change(Message, :count)
        expect(chemical.reload.chemical_data[0]).not_to have_key('extraction_error')
      end
    end

    context 'when LlmTaskRunner raises LlmProviderError' do
      before do
        allow(LlmProviderResolver).to receive(:resolve).and_return(resolution)
        allow(SdsPdfTextExtractor).to receive(:extract).and_return('SDS text')
        allow(LlmTaskRunner).to receive(:new).and_return(runner)
        allow(runner).to receive(:run).and_raise(Errors::LlmProviderError, 'API timeout')
      end

      it 'sets error notification with provider error message' do
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id)
        expect(job.instance_variable_get(:@notification_level)).to eq('error')
        expect(job.instance_variable_get(:@notification_message)).to include('API timeout')
      end

      it 'names the model and provider that refused the request' do
        provider = instance_double(LlmProvider, name: 'KIT KI-Toolbox')
        allow(runner).to receive(:resolution).and_return(
          LlmProviderResolver::LlmResolution.new(provider: provider, model: 'gemini-3.6-flash',
                                                 api_key: 'k', base_url: 'u', protocol: 'openai'),
        )
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id)

        expect(job.instance_variable_get(:@notification_message))
          .to end_with('API timeout (model gemini-3.6-flash on KIT KI-Toolbox)')
      end

      it 'tells the user the cause but stores only a generic failure marker' do
        expect { described_class.perform_now(sample_id: sample.id, user_id: user.id) }
          .to change(Message, :count).by(1)
        expect(Message.last.content['data']).to include('API timeout')
        expect(chemical.reload.chemical_data[0]['extraction_error'])
          .to include('message' => described_class::FAILURE_MARKER_MESSAGE, 'failed_at' => be_present)
      end

      it 'records the failure without overwriting a write that lands meanwhile' do
        allow(runner).to receive(:run) do
          snapshot = Chemical.find(chemical.id)
          edit = "chemical_data = jsonb_set(chemical_data, '{0,note}', '\"kept\"')"
          Chemical.where(id: chemical.id).update_all(edit) # rubocop:disable Rails/SkipsModelValidations
          allow(Chemical).to receive(:find_by).with(sample_id: sample.id).and_return(snapshot)
          raise Errors::LlmProviderError, 'API timeout'
        end
        described_class.perform_now(sample_id: sample.id, user_id: user.id)

        entry = chemical.reload.chemical_data[0]
        expect(entry['note']).to eq('kept')
        expect(entry['extraction_error']).to be_present
      end
    end

    context 'with a run marker already on the chemical' do
      let(:job) { described_class.new(sample_id: sample.id, user_id: user.id) }

      before do
        allow(LlmProviderResolver).to receive(:resolve).and_return(resolution)
        allow(SdsPdfTextExtractor).to receive(:extract).and_return('SDS text')
        allow(LlmTaskRunner).to receive(:new).and_return(runner)
      end

      def stamp_run(run)
        data = chemical.chemical_data.deep_dup
        data[0]['extraction_run'] = run
        chemical.update!(chemical_data: data)
      end

      it 'takes over a run of this job that died without finishing' do
        stamp_run('job_id' => job.job_id, 'token' => 'dead', 'started_at' => 2.hours.ago.iso8601)

        expect { job.perform_now }.to change(Message, :count).by(1)
        expect(chemical.reload.chemical_data[0]['aiExtraction']).to be_present
      end

      it 'refuses a second execution of this job while the first is running' do
        stamp_run('job_id' => job.job_id, 'token' => 'live', 'started_at' => 1.minute.ago.iso8601)

        expect { job.perform_now }.not_to change(Message, :count)
        expect(LlmTaskRunner).not_to have_received(:new)
      end

      it 'refuses a re-run of this job once it has finished' do
        stamp_run('job_id' => job.job_id, 'token' => 'done', 'started_at' => 2.hours.ago.iso8601,
                  'finished_at' => 2.hours.ago.iso8601)

        expect { job.perform_now }.not_to change(Message, :count)
        expect(LlmTaskRunner).not_to have_received(:new)
      end

      it 'marks its own run finished on success and on failure' do
        job.perform_now
        expect(chemical.reload.chemical_data[0]['extraction_run']['finished_at']).to be_present

        allow(runner).to receive(:run).and_raise(Errors::LlmProviderError, 'API timeout')
        described_class.perform_now(sample_id: sample.id, user_id: user.id)
        expect(chemical.reload.chemical_data[0]['extraction_run']['finished_at']).to be_present
      end
    end

    context 'when a newer extraction claims the sample while the model answers' do
      before do
        allow(LlmProviderResolver).to receive(:resolve).and_return(resolution)
        allow(SdsPdfTextExtractor).to receive(:extract).and_return('SDS text')
        allow(LlmTaskRunner).to receive(:new).and_return(runner)
        allow(runner).to receive(:run) do
          data = chemical.reload.chemical_data.deep_dup
          data[0]['extraction_run'] = { 'token' => 'newer-run', 'started_at' => Time.current.iso8601 }
          chemical.update_columns(chemical_data: data) # rubocop:disable Rails/SkipsModelValidations
          extraction_result
        end
      end

      it 'leaves the record to the newer run and notifies nobody' do
        expect { described_class.perform_now(sample_id: sample.id, user_id: user.id) }
          .not_to change(Message, :count)
        entry = chemical.reload.chemical_data[0]
        expect(entry).not_to have_key('aiExtraction')
        expect(entry['extraction_run']['token']).to eq('newer-run')
      end
    end

    context 'when the user may no longer edit the sample' do
      let(:outsider) { create(:person) }

      before do
        allow(LlmProviderResolver).to receive(:resolve).and_return(resolution)
        allow(SdsPdfTextExtractor).to receive(:extract).and_return('SDS text')
        allow(LlmTaskRunner).to receive(:new).and_return(runner)
      end

      it 'fails before calling the model' do
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: outsider.id)

        expect(LlmTaskRunner).not_to have_received(:new)
        expect(job.instance_variable_get(:@notification_message)).to include('may not edit')
      end
    end

    context 'when the chemical has no chemical_data yet' do
      before do
        allow(LlmProviderResolver).to receive(:resolve).and_return(resolution)
        allow(SdsPdfTextExtractor).to receive(:extract).and_return('SDS text')
        allow(LlmTaskRunner).to receive(:new).and_return(runner)
        chemical.update_columns(chemical_data: nil) # rubocop:disable Rails/SkipsModelValidations
      end

      it 'writes the result for the sheet it is given' do
        job = described_class.new
        job.perform(sample_id: sample.id, user_id: user.id, sheet_path: '/safety_sheets/merck/test.pdf')

        expect(job.instance_variable_get(:@notification_level)).to eq('info')
        expect(chemical.reload.chemical_data[0]['aiExtraction']['chemical_name']).to eq('Phenol')
      end
    end
  end

  describe 'notification state' do
    it 'starts as a failure, so a run that ends early cannot report success' do
      job = described_class.new
      job.send(:start_notification, sample.id, user.id)

      expect(job.instance_variable_get(:@notification_level)).to eq('error')
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
# rubocop:enable RSpec/AnyInstance
# rubocop:enable RSpec/MessageSpies
