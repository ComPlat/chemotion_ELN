# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Comment do
  describe 'creation' do
    let(:sample) { create(:sample) }
    let(:user) { create(:user) }

    context 'with valid attributes' do
      let(:comment) do
        create(:comment, commentable: sample, section: described_class.sample_sections[:properties], creator: user)
      end

      it 'is valid' do
        expect(comment.valid?).to be true
      end

      it 'is associated with the correct commentable' do
        expect(comment.commentable).to eq(sample)
      end

      it 'has the correct section' do
        expect(comment.section).to eq described_class.sample_sections[:properties]
      end

      it 'is associated with the correct creator' do
        expect(comment.creator).to eq(user)
      end
    end

    context 'with missing attributes' do
      it 'is not valid without a commentable' do
        comment = build(:comment, commentable: nil)
        expect(comment.valid?).to be false
        expect(comment.errors[:commentable]).to include('must exist')
      end

      it 'is not valid without a section' do
        comment = build(:comment, section: nil)
        expect(comment.valid?).to be false
        expect(comment.errors[:section]).to include("can't be blank")
      end

      it 'is not valid without a creator' do
        comment = build(:comment, creator: nil)
        expect(comment.valid?).to be false
        expect(comment.errors[:creator]).to include('must exist')
      end
    end
  end
end
