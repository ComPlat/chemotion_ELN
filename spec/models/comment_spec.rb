# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Comment, type: :model do
  describe 'creation' do
    let(:sample) { create(:sample) }
    let(:comment) { create(:comment, commentable: sample) }

    it 'is possible to create a valid comment' do
      expect(comment.valid?).to be(true)
    end

    it 'is valid user id' do
      expect(comment.created_by).to eq(0)
    end
  end
end
