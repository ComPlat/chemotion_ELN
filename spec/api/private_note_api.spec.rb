# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PrivateNoteAPI do
  context "authorized user didn't log in" do
    let(:user) { create(:person, id: 1) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/private_notes/:id' do
      let(:note_1) { create(:private_note, user_id: 2) }

      before do
        get "/api/v1/private_notes/#{note_1.id}"
      end

      it 'returns 401 status code' do
        expect(response.status).to eq 401
      end
    end

    describe 'PUT /api/v1/private_notes/:id' do
      context 'with only content' do
        let(:note_1) { create(:private_note, user_id: 2) }
        let(:params) do
          {
            content: 'test note',
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it 'returns 401 status code' do
          expect(response.status).to eq 401
        end
      end

      context 'with sample' do
        let(:user2) { create(:person, id: 3) }
        let(:note_1) { create(:private_note, user_id: 2) }
        let!(:c) { create(:collection, user: user2, is_shared: false) }
        let!(:s) { create(:sample, collections: [c]) }
        let(:params) do
          {
            content: 'test note',
            noteable_id: s.id,
            noteable_type: 'sample'
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it 'returns 401 status code' do
          expect(response.status).to eq 401
        end
      end

      context 'with reaction' do
        let(:user3) { create(:person, id: 4) }
        let(:note_1) { create(:private_note, user_id: 2) }
        let!(:c) { create(:collection, user: user3, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:params) do
          {
            content: 'test note q',
            noteable_id: r.id,
            noteable_type: 'reaction'
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it 'returns 401 status code' do
          expect(response.status).to eq 401
        end
      end
    end
    
    describe 'DELETE /api/v1/private_notes/:id' do
      let(:note_1) do
        create(:private_note, content: 'test', user_id: 2)
      end

      before do
        delete "/api/v1/private_notes/#{note_1.id}"
      end

      it 'returns 401 status code' do
        expect(response.status).to eq 401
      end
    end
  end

  context 'authorized user logged in' do
    let(:user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(user)
    end

    describe 'GET /api/v1/private_notes/:id' do
      let(:note_1) { create(:private_note, user_id: user.id) }

      before do
        get "/api/v1/private_notes/#{note_1.id}"
      end

      it 'api run success' do
        expect(response.body).not_to be_nil
      end

      it 'returned data' do
        n = JSON.parse(response.body)['note'].symbolize_keys
        expect(n[:id]).to eq(note_1.id)
      end
    end

    describe 'POST /api/v1/private_notes' do
      context 'with only content' do
        let(:params) do
          {
            content: 'test note',
          }
        end

        before do
          post "/api/v1/private_notes", params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note')
          expect(note).not_to be_nil
        end
      end

      context 'with sample' do
        let!(:c) { create(:collection, user: user, is_shared: false) }
        let!(:s) { create(:sample, collections: [c]) }
        let(:params) do
          {
            content: 'test note',
            noteable_id: s.id,
            noteable_type: 'sample'
          }
        end

        before do
          post "/api/v1/private_notes/create", params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note')
          expect(note).not_to be_nil
        end

        it 'is valid in sample' do
          note = PrivateNote.find_by(content: 'test note')
          s1 = Sample.find_by(id: note.noteable_id)
          expect(s1.id).to eq(s.id)
        end
      end

      context 'with reaction' do
        let!(:c) { create(:collection, user: user, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:params) do
          {
            content: 'test note',
            noteable_id: r.id,
            noteable_type: 'reaction'
          }
        end

        before do
          post "/api/v1/private_notes", params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note')
          expect(note).not_to be_nil
        end

        it 'is valid in reaction' do
          note = PrivateNote.find_by(content: 'test note')
          r1 = Reaction.find(note.noteable_id)
          expect(r1.id).to eq(r.id)
        end
      end
    end

    describe 'PUT /api/v1/private_notes/:id' do
      context 'with only content' do
        let(:note_1) { create(:private_note) }
        let(:params) do
          {
            content: 'test note',
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note_1.id)
          expect(note.content).to eq('test note')
        end
      end

      context 'with sample' do
        let(:note_1) { create(:private_note) }
        let!(:c) { create(:collection, user: user, is_shared: false) }
        let!(:s) { create(:sample, collections: [c]) }
        let(:params) do
          {
            content: 'test note',
            noteable_id: s.id,
            noteable_type: 'sample'
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note_1.id)
          expect([note.content, note.noteable_id, note.noteable_type]).to eq(['test note', s.id, 'sample'])
        end
      end

      context 'with reaction' do
        let(:note_1) { create(:private_note, user_id: user.id) }
        let!(:c) { create(:collection, user: user, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:params) do
          {
            content: 'test note q',
            noteable_id: r.id,
            noteable_type: 'reaction'
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note_1.id)
          expect([note.content, note.noteable_id, note.noteable_type]).to eq(['test note 1', r.id, 'reaction'])
        end
      end
    end

    describe 'DELETE /api/v1/private_notes/:id' do
      let(:note_1) do
        create(:private_note, content: 'test', user_id: user.id)
      end

      before do
        delete "/api/v1/private_notes/#{note_1.id}"
      end

      it "is able to delete private note" do
        note = PrivateNote.find_by(content: 'test')
        expect(note).to be_nil
      end
    end
  end
end