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
    # Import::ImportSdf#message returns a String in production (not a Hash) -- stub it
    # as such so this spec can't hide a type error in how ImportSamplesJob handles it.
    let(:result_message) { 'no rows to import' }
    let(:parameters) do
      {
        collection_id: create(:collection).id,
        user_id: create(:user).id,
        attachment: attachment,
      }
    end
    let(:import_job) { described_class.perform_later(parameters) }

    before do
      allow(Import::ImportSdf).to receive(:new).and_return(import_samples_instance)
      allow(import_samples_instance).to receive(:import_from_file)
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

  context 'when the attachment filename extension is upper/mixed case' do
    let(:import_samples_instance) do
      instance_double(Import::ImportSamples, process: { status: 'ok', message: '', data: [] })
    end
    let(:import_sdf_instance) { instance_double(Import::ImportSdf, import_from_file: nil, message: '') }
    let(:parameters) do
      {
        collection_id: create(:collection).id, user_id: create(:user).id,
        attachment: attachment, import_type: 'sample'
      }
    end

    before do
      allow(Import::ImportSamples).to receive(:new).and_return(import_samples_instance)
      allow(Import::ImportSdf).to receive(:new).and_return(import_sdf_instance)
    end

    context 'with a .XLSX extension' do
      let(:attachment) { instance_double(Attachment, filename: 'Sample.XLSX') }

      it 'still routes to Import::ImportSamples instead of "Unsupported format"' do
        described_class.new.perform(parameters)

        expect(Import::ImportSamples).to have_received(:new)
      end
    end

    context 'with a .SDF extension' do
      let(:attachment) { instance_double(Attachment, filename: 'Structures.SDF') }

      it 'still routes to Import::ImportSdf instead of "Unsupported format"' do
        described_class.new.perform(parameters)

        expect(Import::ImportSdf).to have_received(:new)
      end
    end
  end
end
