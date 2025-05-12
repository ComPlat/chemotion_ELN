# frozen_string_literal: true

# require 'factory_bot'
# require 'rspec'
# require 'net/imap'
# require 'faker'

FactoryBot.define do
  factory :net_imap_address, class: RSpec::Mocks::InstanceVerifyingDouble do
    transient do
      email { Faker::Internet.email }
    end
    initialize_with do
      RSpec::Mocks::Double.new(
        Net::IMAP::Address,
        mailbox: email.split('@').first,
        host: email.split('@').last,
      )
    end
  end
  factory :net_imap_envelope, class: RSpec::Mocks::InstanceVerifyingDouble do
    transient do
      subject { Faker::Lorem.word }
      from { [Faker::Internet.email] }
      to { [Faker::Internet.email] }
      cc { [] }
      date { Faker::Time.backward }
      message_id { "<#{Faker::Internet.uuid}@#{Faker::Internet.domain_name}>" }
    end

    initialize_with do
      RSpec::Mocks::Double.new(
        Net::IMAP::Envelope,
        subject: subject,
        from: from.map { |email| FactoryBot.build(:net_imap_address, email: email) },
        to: to.map { |email| FactoryBot.build(:net_imap_address, email: email) },
        cc: cc.map { |email| FactoryBot.build(:net_imap_address, email: email) },
        date: date,
        message_id: message_id,
      )
    end
  end
end
