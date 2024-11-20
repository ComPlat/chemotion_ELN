# frozen_string_literal: true

class UpdateGoechemChemicalsJob < ApplicationJob
  include ActiveJob::Status

  # Dynamically set the queue based on the job type
  def initialize(*arguments)
    super
    @params = arguments[0] || {}
    self.queue_name = case @params[:job]
                      when 'sync_goechem'
                        :sync_goechem
                      when 'fetch_goechem_updates'
                        :fetch_goechem_updates
                      end
  end

  after_perform do
    notify_channel
  rescue StandardError => e
    Delayed::Worker.logger.error e
  end

  def perform(params)
    @params = params
    @user_id = params[:user_id]
    @result = {}

    begin
      case params[:job]
      when 'sync_goechem'
        sync_job = GoeChem::Sync.new(params[:collection_id])
        @result = sync_job.process
      when 'fetch_goechem_updates'
        update_job = GoeChem::FetchUpdates.new(params[:collection_id])
        @result[:message] = update_job.message
      end
    rescue StandardError => e
      Delayed::Worker.logger.error e
      @result[:message] = "An error occurred: #{e.message}"
    end
  end

  private

  def notify_channel
    channel_subject = case @params[:job]
                      when 'sync_goechem'
                        Channel::SYNC_GOECHEM_CHEMICALS_NOTIFICATION
                      when 'fetch_goechem_updates'
                        Channel::FETCH_GOECHEM_UPDATES_NOTIFICATION
                      end

    Message.create_msg_notification(
      channel_subject: channel_subject,
      message_from: @user_id,
      message_to: [@user_id],
      data_args: { message: @result[:message] },
      level: 'info',
      autoDismiss: 5,
    )
  end
end
