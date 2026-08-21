# frozen_string_literal: true

require 'rails_helper'

describe ExportCollectionsJob do
  describe '#skipped_notice' do
    let(:job) { described_class.new }

    it 'is empty when the archive is complete' do
      job.instance_variable_set(:@skipped_count, 0)

      expect(job.skipped_notice).to eq('')
    end

    it 'names a single omitted attachment' do
      job.instance_variable_set(:@skipped_count, 1)

      expect(job.skipped_notice).to eq(
        "\n1 attachment could not be included (see description.txt in the archive).",
      )
    end

    it 'pluralises for several omitted attachments' do
      job.instance_variable_set(:@skipped_count, 3)

      expect(job.skipped_notice).to start_with("\n3 attachments could not be included")
    end
  end

  # Channel::COLLECTION_ZIP is shared by ExportCollectionsJob and ImportCollectionsJob, and
  # Channel.build_message renders msg_template with Kernel#format: a placeholder the producer
  # does not supply raises KeyError and the user gets no notification at all. These pin both
  # producers against the %{skipped} placeholder added for the export omissions notice.
  describe 'the shared COLLECTION_ZIP message template' do
    # Mirrors db/migrate/20260821090000_add_skipped_to_collection_zip_notification.rb;
    # the suite truncates before running, so the channel row has to be recreated here.
    # rubocop:disable Style/FormatStringToken
    before do
      Channel.find_or_create_by(subject: Channel::COLLECTION_ZIP).update(
        channel_type: 8,
        msg_template: {
          'data' => 'Collection %{operation}: %{col_labels} processed successfully. ' \
                    '%{expires_at}%{skipped}',
          'action' => 'CollectionActions.fetchUnsharedCollectionRoots',
          'level' => 'success',
        },
      )
    end
    # rubocop:enable Style/FormatStringToken

    it 'renders the omissions notice for an export that skipped attachments' do
      message = Channel.build_message(
        channel_subject: Channel::COLLECTION_ZIP,
        data_args: {
          expires_at: 'tomorrow', operation: 'Export', col_labels: ['Awesome Collection'],
          skipped: "\n2 attachments could not be included (see description.txt in the archive)."
        },
      )

      expect(message['data']).to include('2 attachments could not be included')
    end

    it 'renders nothing extra for a complete export' do
      message = Channel.build_message(
        channel_subject: Channel::COLLECTION_ZIP,
        data_args: {
          expires_at: 'tomorrow', operation: 'Export', col_labels: ['Awesome Collection'],
          skipped: ''
        },
      )

      expect(message['data']).to eq('Collection Export: ["Awesome Collection"] processed successfully. tomorrow')
    end

    # Regression: the import job posts to the same channel and must keep supplying every key.
    it 'still renders the import notification' do
      expect do
        Channel.build_message(
          channel_subject: Channel::COLLECTION_ZIP,
          data_args: { col_labels: 'imported', operation: 'import', expires_at: nil, skipped: '' },
        )
      end.not_to raise_error
    end

    it 'raises when a producer omits the skipped key' do
      expect do
        Channel.build_message(
          channel_subject: Channel::COLLECTION_ZIP,
          data_args: { col_labels: 'imported', operation: 'import', expires_at: nil },
        )
      end.to raise_error(KeyError)
    end
  end
end
