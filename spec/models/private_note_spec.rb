# == Schema Information
#
# Table name: private_notes
#
#  id            :bigint           not null, primary key
#  content       :string
#  created_by    :integer          not null
#  noteable_type :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  noteable_id   :integer
#
# Indexes
#
#  index_private_note_on_user                            (created_by)
#  index_private_notes_on_noteable_type_and_noteable_id  (noteable_type,noteable_id)
#
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
