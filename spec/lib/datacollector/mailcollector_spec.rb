# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Datacollector::Mailcollector do
  let(:users) { create_list(:person, 2) }
  let(:users_unknown) { build_list(:person, 1) }
  let(:name_abbrs) { (users + users_unknown).map(&:name_abbreviation) }
  let(:emails) { (users + users_unknown).map(&:email) }
  let(:mail_collector) { described_class.new }

  describe '.initialize' do
    before do
      allow(mail_collector).to receive(:login).and_return(true)
    end

    it 'initializes the object' do
      expect(mail_collector).to be_instance_of(described_class)
      expect(mail_collector.config).to be_instance_of(Datacollector::MailConfiguration)
    end

    it 'returns the server address' do
      expect(mail_collector.server).to eq(Rails.configuration.datacollectors[:mailcollector][:server])
    end
  end

  describe '.execute' do
    let(:device) { create(:device) }
    let(:imap) { instance_double(Net::IMAP) }
    let(:envelopes) { build_list(:net_imap_envelope, 1) }

    before do
      allow(mail_collector).to receive_messages(
        login: true,         # mock the login method
        imap: imap,          # mock the imap object
        handle_message: nil, # do not handle messages
        logout: true,        # mock the logout method
      )
      # context: all envelopes are 'NOT SEEN' by default
      # return the envelope ids [Integer] for the search query NOT SEEN (skip index 0)
      allow(imap).to receive(:search).with(%w[NOT SEEN]).and_return((1..(envelopes.size - 1)).to_a)
      allow(imap).to receive(:store)
      # .open_envelope: set the current envelope to the mocked envelope with the given id
      allow(mail_collector).to receive(:open_envelope).and_wrap_original do |_original_method, id|
        mail_collector.instance_variable_set(:@envelope, envelopes[id])
      end
      mail_collector.execute
    end

    # This context is to ensure the looping over multiple envelopes works as expected
    #   - correspondences defined for each envelope
    #   - envelope marked as Seen if the recipient is users_unknown
    #   - envelope handled and deleted if the recipient is known
    context 'with 2 envelopes, the first from an unknown recipient and the second from a known recipient' do
      let(:envelopes) do
        # an array of Net::IMAP::Envelope objects
        # - envelopes[1] is from device to some_person unknown to the system
        # - envelopes[2] is from device to person known to the system
        # - envelopes[0] not used - dummy to keep the index in sync with the id
        [
          nil,
          build(:net_imap_envelope, from: [device.email], to: [users_unknown.first.email]),
          build(:net_imap_envelope, from: [device.email], to: [users.first.email]),
        ]
      end

      it 'marks emails as Seen if the `to` email is not known' do
        # expect not to define a correspondence for the envelope 1 since the `to` email is unknown
        # then set the Seen flag for the envelope 1
        expect(imap).to have_received(:store).with(1, '+FLAGS', [:Seen])
      end

      it 'handles messages and deletes them if the `to` email is known (correspondence is defined)' do
        # expect to define a correspondence for the envelope 2 since the `to` email is known
        expect(mail_collector).to have_received(:handle_message).with(2)
        expect(imap).to have_received(:store).with(2, '+FLAGS', [:Deleted])
      end
    end

    context 'with 2 envelopes, with a known user in `cc` and the second with a unknown `to` recipient' do
      let(:envelopes) do
        # an array of Net::IMAP::Envelope objects
        # - envelopes[1] is from device to an unknown email and cc to a known email
        # - envelopes[2] is from device to an unknown email
        # - envelopes[0] not used - dummy to keep the index in sync with the id
        [
          nil,
          build(:net_imap_envelope, from: [device.email], to: [users_unknown.first.email], cc: [users.last.email]),
          build(:net_imap_envelope, from: [device.email], to: [users_unknown.first.email]),
        ]
      end

      it 'marks emails as Seen if none of the recipients are known' do
        # expect not to define a correspondence for the envelope 2 since the person email is known
        expect(imap).to have_received(:store).with(2, '+FLAGS', [:Seen])
      end

      it 'handles messages and deletes them if the recipient is known (correspondence is defined)' do
        # expect to define a correspondence for the envelope 1 since the `cc` email is known
        expect(mail_collector).to have_received(:handle_message).with(1)
        expect(imap).to have_received(:store).with(1, '+FLAGS', [:Deleted])
      end
    end

    it 'logs out after processing emails' do
      expect(mail_collector).to have_received(:logout)
    end
  end
end
