# frozen_string_literal: true

FactoryBot.define do
  factory :device_metadata do
    name { 'Device Metadata' }
    sequence(:doi) { |i| "10.12345/DEVICE-#{i}" }
    url { "https://the-device-page.org/#{doi}" }
    landing_page { "https://the-content-page.org/#{doi}" }
    type {}
    description { 'Metadata for device' }
    publisher { 'Chemotion' }
    publication_year { Time.current.year }
    owners do
      [
        {
          ownerName: Faker::Company.name,
          ownerContact: Faker::Internet.email,
          ownerIdentifier: {}
        }
      ]
    end
    manufacturers do
      [
        {
          manufacturerName: Faker::Company.name,
          modelName: 'TES-T 123',
          manufacturererIdentifier: {
            manufacturerIdentifier: 1,
            manufacturerIdentifierType: 2
          }
        }
      ]
    end
    dates do
      [
        {
          date: '2020-11-11',
          dateType: 'Commissioned'
        }
      ]
    end
  end
end
