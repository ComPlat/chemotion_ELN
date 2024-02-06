# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ThirdPartyApp, type: :model do
  describe '.all_names' do
    context 'when entries exist' do
      before do
        described_class.create(url: "http://test.com", name: "Test1")
        described_class.create(url: "http://test.com", name: "Test2")
      end

      it 'returns an array of names' do
        expected_names = ['Test1', 'Test2']
        actual_names = described_class.all_names

        expect(actual_names).to match_array(expected_names)
      end
    end

    context 'when no entries exist' do
      before do
        described_class.destroy_all
      end

      it 'returns nil' do
        names = described_class.all_names

        expect(names).to be_nil
      end
    end
  end
end
