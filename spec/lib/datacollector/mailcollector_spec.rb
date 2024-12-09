# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Datacollector::Mailcollector do
  let(:users) { create_list(:person, 2) }
  let(:users_unknown) { build_list(:person, 1) }
  let(:name_abbrs) { (users + users_unknown).map(&:name_abbreviation) }
  let(:emails) { (users + users_unknown).map(&:email) }
  let(:mail_collector) { described_class.new }

  describe '.initialize' do
    # rubocop:disable RSpec/AnyInstance
    before do
      allow_any_instance_of(described_class).to receive(:login).and_return(true)
    end
    # rubocop:enable RSpec/AnyInstance

    it 'initializes the object' do
      expect(mail_collector).to be_instance_of(described_class)
      expect(mail_collector.config).to be_instance_of(Datacollector::MailConfiguration)
    end

    it 'returns the server address' do
      expect(mail_collector.server).to eq(Rails.configuration.datacollectors[:mailcollector][:server])
    end
  end
end
