# frozen_string_literal: true

require 'securerandom'
describe ImportSamplesJob, active_job: true do
  context 'when import file format is xlsx' do
    let(:attachment) { create(:attachment, :with_sample_import_template) }
    let(:import_samples_instance) { instance_double(Import::ImportSamples) }
    let(:parameters) do
      {
        collection_id: create(:collection).id,
        user_id: create(:user).id,
        attachment: attachment,
        import_type: 'sample',
        sdf_rows: [],
        mapped_keys: {},
      }
    end
    let(:import_job) { described_class.perform_later(parameters) }

    before do
      allow(Import::ImportSamples).to receive(:new).and_return(import_samples_instance)
      allow(import_samples_instance).to receive(:process).and_return(
        { status: 'ok',
          message: 'samples have been imported successfully',
          data: [] },
      )
    end

    context 'when perform_later is called' do
      it 'import samples job gets enqueued' do
        expect { import_job }.to have_enqueued_job(described_class)
      end

      it 'receives perform_later with expected arguments' do
        allow(import_job).to receive(:perform)
        import_job.perform(parameters)
        expect(import_job).to have_received(:perform).with(parameters)
      end

      it 'performs the import job and triggers after job of creates a message' do
        perform_enqueued_jobs do
          allow(Message).to receive(:create_msg_notification)
          import_job

          expect(import_samples_instance).to have_received(:process)
          expect(Message).to have_received(:create_msg_notification)
          expect { described_class.perform_now(parameters) }.not_to raise_error
        end
      end
    end

    context 'when error is produced during performing job' do
      it 'logs the error and does not raise an exception' do
        allow(Delayed::Worker.logger).to receive(:error)
        allow(import_samples_instance).to receive(:process).and_raise(StandardError)
        perform_enqueued_jobs do
          described_class.perform_now(parameters)
          expect(Delayed::Worker.logger).to have_received(:error).at_least(:once)
        end
      end
    end

    context 'when perform_now is executed without being enqueued' do
      let(:perform_now) { described_class.new.perform(parameters) }

      it 'no samples have been imported' do
        expect(perform_now[:data]).to eq []
        expect(perform_now[:status]).to be 'ok'
      end
    end
  end

  context 'when import file format is sdf' do
    let(:attachment) do
      create(:attachment,
             filename: 'import_sample_data.sdf',
             file_path: 'spec/fixtures/import_sample_data.sdf')
    end
    let(:import_samples_instance) { instance_double(Import::ImportSdf) }
    let(:result_message) do
      { message: 'no rows to import' }
    end
    let(:parameters) do
      {
        collection_id: create(:collection).id,
        user_id: create(:user).id,
        attachment: attachment,
        sdf_rows: [],
        mapped_keys: {},
      }
    end
    let(:import_job) { described_class.perform_later(parameters) }

    before do
      allow(Import::ImportSdf).to receive(:new).and_return(import_samples_instance)
      allow(import_samples_instance).to receive(:create_samples)
      allow(import_samples_instance).to receive(:message).and_return(result_message)
    end

    context 'when perform_later is called' do
      it 'import samples job gets enqueued' do
        expect { import_job }.to have_enqueued_job(described_class)
      end

      it 'receives perform_later with expected arguments' do
        allow(import_job).to receive(:perform)
        import_job.perform(parameters)
        expect(import_job).to have_received(:perform).with(parameters)
      end

      it 'performs the import job and triggers after job of creates a message' do
        perform_enqueued_jobs do
          allow(Message).to receive(:create_msg_notification)
          import_job

          expect(Message).to have_received(:create_msg_notification)
          expect { described_class.perform_now(parameters) }.not_to raise_error
        end
      end
    end
  end
end
