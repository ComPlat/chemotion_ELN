# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::PrivateNoteAPI do
  context "unauthorized user can't log in" do
    let(:authoirzed_user) { create(:user) }
    let(:unauthoirzed_user) { create(:person) }

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(authoirzed_user)
    end

    describe 'GET /api/v1/private_notes/:id' do
      let!(:c) { create(:collection, user: authoirzed_user, is_shared: false) }
      let!(:r) { create(:reaction, collections: [c]) }
      let(:note_1) { create(:private_note, noteable: r, user_id: unauthoirzed_user.id) }

      before do
        get "/api/v1/private_notes/#{note_1.id}"
      end

      it 'returns 401 status code' do
        expect(response.status).to eq 401
      end
    end

    describe 'PUT /api/v1/private_notes/:id' do
      context 'update with only content' do
        let!(:c) { create(:collection, user: authoirzed_user, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:note_1) { create(:private_note, noteable: r, user_id: unauthoirzed_user.id) }
        let(:params) do
          {
            content: 'test note'
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
        let!(:c) { create(:collection, user: user2, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:note_1) { create(:private_note, noteable: r, user_id: unauthoirzed_user.id) }
        let!(:s) { create(:sample, collections: [c]) }
        let(:params) do
          {
            content: 'test note',
            noteable_id: s.id,
            noteable_type: 'Sample'
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
        let!(:c) { create(:collection, user: user3, is_shared: false) }
        let!(:s) { create(:sample, collections: [c]) }
        let(:note_1) { create(:private_note, noteable: s, user_id: unauthoirzed_user.id) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:params) do
          {
            content: 'test note q',
            noteable_id: r.id,
            noteable_type: 'Reaction'
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
      let!(:c) { create(:collection, user: authoirzed_user, is_shared: false) }
      let!(:r) { create(:reaction, collections: [c]) }
      let(:note_1) { create(:private_note, content: 'test', noteable: r, user_id: unauthoirzed_user.id) }

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
      let!(:c) { create(:collection, user: user, is_shared: false) }
      let!(:r) { create(:reaction, collections: [c]) }
      let(:note_1) { create(:private_note, noteable: r, user_id: user.id) }

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

    describe 'POST /api/v1/private_notes/create' do
      context 'with content' do
        let!(:c) { create(:collection, user: user, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:params) { { content: 'test note', noteable_id: r.id, noteable_type: 'Reaction' } }

        before do
          post "/api/v1/private_notes/create", params
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
            content: 'test note sample',
            noteable_id: s.id,
            noteable_type: 'Sample'
          }
        end

        before do
          post "/api/v1/private_notes/create", params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note sample')
          expect(note).not_to be_nil
        end

        it 'is valid in sample' do
          note = PrivateNote.find_by(content: 'test note sample')
          s1 = Sample.find_by(id: note.noteable_id)
          expect(s1.id).to eq(s.id)
        end
      end

      context 'with reaction' do
        let!(:c) { create(:collection, user: user, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:params) do
          {
            content: 'test note reaction',
            noteable_id: r.id,
            noteable_type: 'Reaction'
          }
        end

        before do
          post "/api/v1/private_notes/create", params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note reaction')
          expect(note).not_to be_nil
        end

        it 'is valid in reaction' do
          note = PrivateNote.find_by(content: 'test note reaction')
          r1 = Reaction.find(note.noteable_id)
          expect(r1.id).to eq(r.id)
        end
      end
    end

    describe 'PUT /api/v1/private_notes/:id' do
      context 'with only content' do
        let!(:c) { create(:collection, user: user, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:note_1) { create(:private_note, noteable: r, user_id: user.id) }
        let(:params) do
          {
            content: 'update test note'
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note_1.id)
          expect(note.content).to eq('update test note')
        end
      end

      context 'with sample' do
        let!(:c) { create(:collection, user: user, is_shared: false) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:note_1) { create(:private_note, noteable: r, user_id: user.id) }
        let!(:s) { create(:sample, collections: [c]) }
        let(:params) do
          {
            content: 'update test note sample',
            # noteable: s
            noteable_id: s.id,
            noteable_type: 'Sample'
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note_1.id)
          expect([note.content, note.noteable_id, note.noteable_type]).to eq(['update test note sample', s.id, 'Sample'])
        end
      end

      context 'with reaction' do
        let!(:c) { create(:collection, user_id: user.id, is_shared: false) }
        let!(:s) { create(:sample, collections: [c]) }
        let(:note_1) { create(:private_note, noteable: s, user_id: user.id) }
        let!(:r) { create(:reaction, collections: [c]) }
        let(:params) do
          {
            content: 'update test note reaction',
            noteable_id: r.id,
            noteable_type: 'Reaction'
          }
        end

        before do
          put "/api/v1/private_notes/#{note_1.id}", params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note_1.id)
          puts "note:: #{note}"
          expect([note.content, note.noteable_id, note.noteable_type]).to eq(['update test note reaction', r.id, 'Reaction'])
        end
      end
    end

    describe 'DELETE /api/v1/private_notes/:id' do
      let(:c) { create(:collection, user_id: user.id, is_shared: false) }
      let(:r) { create(:reaction, collections: [c]) }
      let(:note_1) do
        create(:private_note, content: 'test', noteable: r, user_id: user.id)
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
