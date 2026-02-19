# frozen_string_literal: true

require_relative 'correspondence_helpers'

module Datacollector
  # Define the parties (Users, Devices) involved in one exchange and the destination container
  # Create and attach the attachment from file path to the proper Inbox Container (model) of the recipient
  # @!attribute [r] sender
  #   @return [Device, User] the sender of the correspondence
  #   @note the sender can be a device or a user!
  # @!attribute [r] recipient
  #   @return [User] the recipient of the correspondence
  #   @note the recipient can only be a user (Person or Group)!
  # @!attribute [r] sender_container
  #   @return [Container] the sender's container in the receiver's inbox
  #   @note the sender's container is the destination container for the correspondence
  #     User (receiver) -> Container 'Inbox' -> Container named after the sender (sender_container)
  #     -> Attachments or Container(datasets)
  class Correspondence
    include CorrespondenceHelpers
    extend CorrespondenceHelpers

    attr_reader :sender, :sender_container, :recipient

    # @param to [String, User, Nil] The info to determine the recipient (User) or the recipient itself
    # @param from [String, User, Device] The info to determine the sender (User Device) or the sender itself
    # @return [Correspondence] The correspondence object
    # @raise [Error::DataCollectorError] If no valid sender or recipient is found
    def initialize(from, to) # rubocop:disable Metrics/PerceivedComplexity, Metrics/CyclomaticComplexity
      # if param is a string, find the user or device
      @sender = from.is_a?(String) ? find_sender(from) : from
      @recipient = to.is_a?(String) ? find_recipient(to) : to

      # if the sender is a user (not a device), then it can only send to its own account
      @recipient = @sender if @sender.is_a?(User) && to.blank?

      raise Errors::DatacollectorError, "Sender not found #{from}" unless validate(@sender)
      raise Errors::DatacollectorError, "Recipient not found #{to}" unless validate(@recipient)
      raise Errors::DatacollectorError, 'Recipient can only be a User' unless valid_recipient?(@recipient)
      raise Errors::DatacollectorError, 'User can only send to self' if @sender.is_a?(User) && @recipient != @sender

      prepare_containers
    end

    # Attach the file to the appropriate dataset and trigger notifications
    # @param file_name [String] The name of the file
    # @param file_path [String,Path] The path to the file
    # @return [Attachment] The updated attachment
    def attach(filename, file_path, dataset_name = nil)
      dataset_name = dataset_name.presence || Time.zone.now.strftime('%Y-%m-%d')
      attachment = create_attachment(filename, file_path)
      match, variation = attachment.resolve_unique_match

      if match
        dataset = match.container.analyses_container.create_analysis_with_dataset!(name: dataset_name)
        match.assign_attachment_to_variation(variation, dataset.parent_id) if match.is_a?(Reaction)
      else
        dataset = prepare_dataset(dataset_name)
        # rubocop:disable Rails/SkipsModelValidations
        dataset.touch
        # rubocop:enable Rails/SkipsModelValidations
      end
      attachment.update!(attachable: dataset)

      # Add notifications
      queue = "inbox_#{sender.id}_#{recipient.id}"
      schedule_notification(queue) unless Delayed::Job.find_by(queue: queue)

      attachment.present?
    end

    private

    # Find or create the container where the attachments will be associated
    # @return [Container] The container where the attachments will be associated
    # @note If the recipient has no Inbox container, it will be created
    # @note The sender container will be attached to the user's inbox
    def prepare_containers
      # if the recipient has no inbox, create one
      unless recipient.container
        recipient.container = Container.create(
          name: 'inbox',
          container_type: 'root',
        )
      end
      @sender_container = Container.where(
        name: sender.name,
        container_type: build_sender_box_id(sender.id),
        parent_id: @recipient.container.id,
      ).first_or_create
    end

    # Build the sender box id
    # @param sender_id [Integer] The sender id
    # @return [String] The sender box id
    def build_sender_box_id(sender_id)
      "sender_box_#{sender_id}"
    end

    # Create an attachment for the given file data
    # @param name [String] The filenameFor a user
    # @param path [String, Path] The file path
    # @return [Attachment] The created attachment
    def create_attachment(name, file_data)
      Attachment.create(
        filename: name,
        created_by: sender.id,
        created_by_type: sender.class.name,
        created_for: recipient.id,
        file_path: file_data,
      )
    end

    # Prepare the dataset that will be used to store the attachments
    # @param subject [String] The name of the dataset
    # @todo: limit the number of attachments in the dataset to 50 due to pagination on the inbox
    def prepare_dataset(subject)
      container = Container.where(
        name: subject,
        container_type: 'dataset',
        parent: sender_container,
      ).first_or_create
      # return the container if it has less than Entity::InboxEntity::MAX_ATTACHMENTS
      return container if container.attachments.count < 50 # Entity::InboxEntity::MAX_ATTACHMENTS

      # add a counter `_02` to the subject or increment the subject counter and try again
      subject = /(.+)_(\d+)$/.match?(subject) ? subject.next : "#{subject}_02"
      prepare_dataset(subject)
    end

    # Schedule a notification job
    # @param queue [String] The queue name
    def schedule_notification(queue)
      MessageIncomingDataJob.set(queue: queue, wait: 3.minutes).perform_later(
        sender_container.name, sender, recipient
      )
    end
  end
end
