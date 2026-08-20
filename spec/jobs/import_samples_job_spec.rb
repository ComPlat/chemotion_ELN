# frozen_string_literal: true

require 'securerandom'
describe ImportSamplesJob, :active_job do
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

    # The report is delivered as an Inbox attachment; the notification only has to point at it. The
    # download endpoint already authorises an unlinked inbox attachment for the user it belongs to.
    context 'when the import produced a report' do
      let(:report) do
        create(:attachment, filename: 'list_import_report.xlsx', created_by: parameters[:user_id],
                            created_for: parameters[:user_id], attachable_type: 'Container')
      end

      before do
        allow(import_samples_instance).to receive(:process).and_return(
          { status: 'warning',
            message: 'some rows were not imported',
            report_attachment_id: report.id,
            report_filename: report.filename,
            data: [] },
        )
        allow(Message).to receive(:create_msg_notification)
      end

      it 'links the notification to the report' do
        described_class.perform_now(parameters)
        expect(Message).to have_received(:create_msg_notification)
          .with(hash_including(url: %r{/api/v1/attachments/#{report.id}\z}))
      end

      it 'labels the link with the report filename' do
        described_class.perform_now(parameters)
        expect(Message).to have_received(:create_msg_notification)
          .with(hash_including(urlTitle: "Download #{report.filename}"))
      end

      # The notification handler refreshes the Inbox when it sees this, so the report shows up at the
      # same moment the notification does.
      it 'carries the report id so the Inbox refreshes with the notification' do
        described_class.perform_now(parameters)
        expect(Message).to have_received(:create_msg_notification)
          .with(hash_including(report_attachment_id: report.id))
      end
    end

    context 'when the import produced no report' do
      before { allow(Message).to receive(:create_msg_notification) }

      it 'sends no link' do
        described_class.perform_now(parameters)
        expect(Message).to have_received(:create_msg_notification).with(hash_not_including(:url))
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
      allow(import_samples_instance).to receive_messages(
        import_from_file: nil, message: result_message, status: 'ok',
        error_messages: nil, unprocessable_samples: []
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

          expect(Message).to have_received(:create_msg_notification)
          expect { described_class.perform_now(parameters) }.not_to raise_error
        end
      end
    end

    # The job used to drop ImportSdf's status, so every SDF import notified as a non-dismissing
    # 'info' -- successful ones included -- and a partial one could not be reported as a warning.
    context 'when reporting the outcome' do
      it 'notifies a successful import as a success that dismisses itself' do
        allow(Message).to receive(:create_msg_notification)

        described_class.perform_now(parameters)

        expect(Message).to have_received(:create_msg_notification)
          .with(hash_including(level: 'success', autoDismiss: 10))
      end

      it 'notifies an import with unprocessable rows as a warning that stays on screen' do
        allow(import_samples_instance).to receive(:unprocessable_samples).and_return([2])
        allow(Message).to receive(:create_msg_notification)

        described_class.perform_now(parameters)

        expect(Message).to have_received(:create_msg_notification)
          .with(hash_including(level: 'warning', autoDismiss: 0))
      end

      it 'notifies a failed import as an error' do
        allow(import_samples_instance).to receive(:status).and_return('error')
        allow(Message).to receive(:create_msg_notification)

        described_class.perform_now(parameters)

        expect(Message).to have_received(:create_msg_notification)
          .with(hash_including(level: 'error'))
      end
    end
  end

  context 'when the attachment filename extension is upper/mixed case' do
    let(:import_samples_instance) do
      instance_double(Import::ImportSamples, process: { status: 'ok', message: '', data: [] })
    end
    let(:import_sdf_instance) do
      instance_double(Import::ImportSdf, import_from_file: nil, message: '', status: 'ok',
                                         error_messages: nil, unprocessable_samples: [])
    end
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

  describe 'guard against a crash-retry loop' do
    let(:job) { described_class.new }
    let(:params) do
      {
        collection_id: create(:collection).id,
        user_id: create(:user).id,
        attachment: create(:attachment, :with_sample_import_template),
        import_type: 'sample',
        sdf_rows: [],
        mapped_keys: {},
      }
    end
    let(:importer) { instance_double(Import::ImportSamples) }

    before do
      allow(Import::ImportSamples).to receive(:new).and_return(importer)
      allow(importer).to receive(:process).and_return({ status: 'ok', message: 'done', data: [] })
      ActiveJob::Status.store.clear
    end

    it 'runs the import when no previous attempt is recorded' do
      job.perform(params)
      expect(importer).to have_received(:process)
    end

    it 'clears its marker when the import completes' do
      job.perform(params)
      expect(ActiveJob::Status.store.read("import_samples_job:attempt:#{job.job_id}")).to be_nil
    end

    it 'clears its marker when the import raises' do
      allow(importer).to receive(:process).and_raise(StandardError, 'boom')
      job.perform(params)
      expect(ActiveJob::Status.store.read("import_samples_job:attempt:#{job.job_id}")).to be_nil
    end

    it 'does not re-run the import when a previous attempt left a marker' do
      ActiveJob::Status.store.write("import_samples_job:attempt:#{job.job_id}", Time.current.utc.iso8601)
      job.perform(params)
      expect(importer).not_to have_received(:process)
    end

    it 'reports the interrupted attempt to the user instead of failing silently' do
      ActiveJob::Status.store.write("import_samples_job:attempt:#{job.job_id}", Time.current.utc.iso8601)
      result = job.perform(params)
      expect(result[:status]).to eq('invalid')
      expect(result[:message]).to include('stopped unexpectedly because the worker process was terminated')
    end

    it 'warns that a retry could duplicate already-saved rows' do
      ActiveJob::Status.store.write("import_samples_job:attempt:#{job.job_id}", Time.current.utc.iso8601)
      expect(job.perform(params)[:message]).to include('would be imported twice')
    end

    it 'fails open and still imports when the marker store cannot be read' do
      allow(ActiveJob::Status.store).to receive(:read).and_raise(StandardError, 'store down')
      allow(Delayed::Worker.logger).to receive(:error)
      job.perform(params)
      expect(importer).to have_received(:process)
    end

    it 'fails open and still imports when the marker cannot be written' do
      allow(ActiveJob::Status.store).to receive(:write).and_raise(StandardError, 'store down')
      allow(Delayed::Worker.logger).to receive(:error)
      job.perform(params)
      expect(importer).to have_received(:process)
    end

    it 'keys the marker per job so unrelated imports are unaffected' do
      ActiveJob::Status.store.write("import_samples_job:attempt:#{job.job_id}", Time.current.utc.iso8601)
      other = described_class.new
      other.perform(params)
      expect(importer).to have_received(:process).once
    end
  end

  # The notification used to be hard-coded to level 'info' with autoDismiss 5, so a failed or partial
  # import produced the same unremarkable toast as a clean one and then removed itself.
  describe 'notification severity' do
    let(:job) { described_class.new }

    describe '#notification_level' do
      it 'maps a clean import to success' do
        expect(job.send(:notification_level, 'ok')).to eq('success')
      end

      it 'maps a partial import to warning' do
        expect(job.send(:notification_level, 'warning')).to eq('warning')
      end

      it 'maps a rejected file to error' do
        expect(job.send(:notification_level, 'invalid')).to eq('error')
      end

      it 'falls back to info for an unknown status' do
        expect(job.send(:notification_level, nil)).to eq('info')
      end
    end

    describe '#notify_user' do
      before do
        job.instance_variable_set(:@user_id, create(:user).id)
        job.instance_variable_set(:@collection_id, create(:collection).id)
        allow(Message).to receive(:create_msg_notification)
      end

      it 'forwards the import message' do
        job.instance_variable_set(:@result, { status: 'ok', message: '6 of 6 row(s) were imported.' })
        job.send(:notify_user)
        expect(Message).to have_received(:create_msg_notification)
          .with(hash_including(data_args: { message: '6 of 6 row(s) were imported.' }))
      end

      it 'raises the notification level for a partial import' do
        job.instance_variable_set(:@result, { status: 'warning', message: 'partial' })
        job.send(:notify_user)
        expect(Message).to have_received(:create_msg_notification).with(hash_including(level: 'warning'))
      end

      it 'keeps a partial-import notification on screen instead of auto-dismissing it' do
        job.instance_variable_set(:@result, { status: 'warning', message: 'partial' })
        job.send(:notify_user)
        expect(Message).to have_received(:create_msg_notification).with(hash_including(autoDismiss: 0))
      end

      it 'auto-dismisses only a clean import' do
        job.instance_variable_set(:@result, { status: 'ok', message: 'all good' })
        job.send(:notify_user)
        expect(Message).to have_received(:create_msg_notification).with(hash_including(autoDismiss: 10))
      end

      it 'still notifies when the import produced no result hash' do
        job.instance_variable_set(:@result, nil)
        job.send(:notify_user)
        expect(Message).to have_received(:create_msg_notification).with(hash_including(level: 'info'))
      end
    end
  end
end
