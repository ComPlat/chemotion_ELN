# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CommentHelpers do
  subject(:helper_host) do
    Class.new do
      include CommentHelpers
    end.new
  end

  describe '#sanitize_user_ids' do
    it 'returns an empty array for nil input' do
      expect(helper_host.sanitize_user_ids(nil)).to eq([])
    end

    it 'filters out invalid values and keeps valid integer ids' do
      values = [1, '2', 'abc', '', nil, :invalid, '2.5']

      expect(helper_host.sanitize_user_ids(values)).to eq([1, 2])
    end

    it 'flattens nested arrays and deduplicates ids' do
      values = [[1, '2'], [2, [3, '3', nil]], '1']

      expect(helper_host.sanitize_user_ids(values)).to eq([1, 2, 3])
    end
  end
end
