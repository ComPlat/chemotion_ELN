# frozen_string_literal: true

module Datacollector
  # Build an array of Correspondence object between two arrays
  #
  # @!attribute [r] sender
  #   @return [Device, User] AR Device or User
  # @!attribute [r] recipients
  #   @return [Array<User>] Array of recipients for the exchange
  #
  class CorrespondenceArray < Array
    attr_reader :sender, :recipients

    # @param from [String, User, Device] The sender identifier of the exchange
    # @param to [Array<[String, User]>] Array of recipient identifiers for the exchange
    def initialize(from, to_list) # rubocop:disable Metrics/CyclomaticComplexity, Metrics/PerceivedComplexity
      @sender = from.is_a?(String) ? Correspondence.find_sender(from) : from
      errors = []
      raise Errors::DatacollectorError, "Sender not found #{from}" unless Correspondence.validate(@sender)

      recipients = to_list.presence
      recipients ||=  Correspondence.valid_recipient?(@sender) ? [@sender] : []
      correspondences = recipients.filter_map do |receiver|
        Correspondence.new(@sender, receiver)
      rescue Errors::DatacollectorError => e
        errors << e.message
        nil
      end
      raise Errors::DatacollectorError, errors.join("\n") if correspondences.empty? && errors.any?

      super(correspondences)

      @recipients = map(&:recipient)
    end
  end
end
