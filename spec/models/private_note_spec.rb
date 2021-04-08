require 'rails_helper'

RSpec.describe PrivateNote, type: :model do
  describe 'creation' do
    let(:reaction) { create(:reaction) }
    let(:private_note) { create(:private_note, noteable: reaction) }

    it 'is possible to create a valid private note' do
      expect(private_note.valid?).to be(true)
    end

    it 'is valid user id' do
      expect(private_note.created_by).to eq(0)
    end
  end
end
