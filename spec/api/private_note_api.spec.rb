# frozen_string_literal: true

require 'rails_helper'

RSpec.shared_examples 'an unauthorized response' do
  it 'returns 401 status code' do
    expect(response).to have_http_status(:unauthorized)
  end
end

describe Chemotion::PrivateNoteAPI do
  let!(:unauthorized_user) { create(:person) }
  let!(:author_user) { create(:person) }
  let!(:unauthorized_user_collection) { create(:collection, user: unauthorized_user) }
  let!(:authorized_user_collection) { create(:collection, user: author_user) }
  let!(:reaction) { create(:reaction, collections: [unauthorized_user_collection]) }
  let!(:sample) { create(:sample, collections: [unauthorized_user_collection]) }
  let!(:screen) { create(:screen, collections: [unauthorized_user_collection]) }
  let!(:wellplate) { create(:wellplate, collections: [unauthorized_user_collection]) }
  let!(:research_plan) { create(:research_plan, collections: [unauthorized_user_collection]) }

  context 'unauthorized user, ' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(unauthorized_user)
    end

    describe 'GET /api/v1/private_notes/:id' do
      let(:note1) { create(:private_note, noteable: reaction, user_id: author_user.id) }

      before do
        get "/api/v1/private_notes/#{note1.id}"
      end

      it_behaves_like 'an unauthorized response'
    end

    describe 'PUT /api/v1/private_notes/:id' do
      context 'update with only content' do
        let(:note1) { create(:private_note, noteable: reaction, user_id: author_user.id) }
        let(:params) do
          {
            content: 'test note',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'with sample' do
        let(:note1) { create(:private_note, noteable: reaction, user_id: author_user.id) }
        let(:params) do
          {
            content: 'test note',
            noteable_id: sample.id,
            noteable_type: 'Sample',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'with reaction' do
        let(:note1) { create(:private_note, noteable: sample, user_id: author_user.id) }
        let(:params) do
          {
            content: 'test note reaction',
            noteable_id: reaction.id,
            noteable_type: 'Reaction',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'with screen' do
        let(:note1) { create(:private_note, noteable: reaction, user_id: author_user.id) }
        let(:params) do
          {
            content: 'test note screen',
            noteable_id: screen.id,
            noteable_type: 'Screen',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'with wellplate' do
        let(:note1) { create(:private_note, noteable: screen, user_id: author_user.id) }
        let(:params) do
          {
            content: 'test note wellplate',
            noteable_id: wellplate.id,
            noteable_type: 'Wellplate',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'with research plan' do
        let(:note1) { create(:private_note, noteable: wellplate, user_id: author_user.id) }
        let(:params) do
          {
            content: 'test note research plan',
            noteable_id: research_plan.id,
            noteable_type: 'ResearchPlan',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it_behaves_like 'an unauthorized response'
      end
    end

    describe 'DELETE /api/v1/private_notes/:id' do
      let(:note1) { create(:private_note, content: 'test', noteable: reaction, user_id: author_user.id) }

      before do
        delete "/api/v1/private_notes/#{note1.id}"
      end

      it_behaves_like 'an unauthorized response'
    end
  end

  context 'authorized user' do
    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(author_user)
    end

    describe 'GET /api/v1/private_notes/:id' do
      let(:note1) { create(:private_note, noteable: reaction, user_id: author_user.id) }

      before do
        get "/api/v1/private_notes/#{note1.id}"
      end

      it 'api run success' do
        expect(response.body).not_to be_nil
      end

      it 'returned data' do
        n = JSON.parse(response.body)['note'].symbolize_keys
        expect(n[:id]).to eq(note1.id)
      end
    end

    describe 'POST /api/v1/private_notes' do
      context 'with content' do
        let(:params) { { content: 'test note', noteable_id: reaction.id, noteable_type: 'Reaction' } }

        before do
          post '/api/v1/private_notes', params: params
        end

        it 'is able to create a new note (on unaccessible element)' do
          note = PrivateNote.find_by(content: 'test note')
          expect(note).not_to be_nil
        end
      end

      context 'with sample' do
        let(:params) do
          {
            content: 'test note sample',
            noteable_id: sample.id,
            noteable_type: 'Sample',
          }
        end

        before do
          post '/api/v1/private_notes', params: params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note sample')
          expect(note).not_to be_nil
        end

        it 'is valid in sample' do
          note = PrivateNote.find_by(content: 'test note sample')
          s1 = Sample.find_by(id: note.noteable_id)
          expect(s1.id).to eq(sample.id)
        end
      end

      context 'with reaction' do
        let(:params) do
          {
            content: 'test note reaction',
            noteable_id: reaction.id,
            noteable_type: 'Reaction',
          }
        end

        before do
          post '/api/v1/private_notes', params: params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note reaction')
          expect(note).not_to be_nil
        end

        it 'is valid in reaction' do
          note = PrivateNote.find_by(content: 'test note reaction')
          r1 = Reaction.find(note.noteable_id)
          expect(r1.id).to eq(reaction.id)
        end
      end

      context 'with screen' do
        let(:params) do
          {
            content: 'test note screen',
            noteable_id: screen.id,
            noteable_type: 'Screen',
          }
        end

        before do
          post '/api/v1/private_notes', params: params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note screen')
          expect(note).not_to be_nil
        end

        it 'is valid in screen' do
          note = PrivateNote.find_by(content: 'test note screen')
          sc1 = Screen.find(note.noteable_id)
          expect(sc1.id).to eq(screen.id)
        end
      end

      context 'with wellplate' do
        let(:params) do
          {
            content: 'test note wellplate',
            noteable_id: wellplate.id,
            noteable_type: 'Wellplate',
          }
        end

        before do
          post '/api/v1/private_notes', params: params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note wellplate')
          expect(note).not_to be_nil
        end

        it 'is valid in wellplate' do
          note = PrivateNote.find_by(content: 'test note wellplate')
          w1 = Wellplate.find(note.noteable_id)
          expect(w1.id).to eq(wellplate.id)
        end
      end

      context 'with research plan' do
        let(:params) do
          {
            content: 'test note research plan',
            noteable_id: research_plan.id,
            noteable_type: 'ResearchPlan',
          }
        end

        before do
          post '/api/v1/private_notes', params: params
        end

        it 'is able to create a new note' do
          note = PrivateNote.find_by(content: 'test note research plan')
          expect(note).not_to be_nil
        end

        it 'is valid in research plan' do
          note = PrivateNote.find_by(content: 'test note research plan')
          rp1 = ResearchPlan.find(note.noteable_id)
          expect(rp1.id).to eq(research_plan.id)
        end
      end
    end

    describe 'PUT /api/v1/private_notes/:id' do
      context 'with only content' do
        let(:note1) { create(:private_note, noteable: reaction, user_id: author_user.id) }
        let(:params) do
          {
            content: 'update test note',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note1.id)
          expect(note.content).to eq('update test note')
        end
      end

      context 'with sample' do
        let(:note1) { create(:private_note, noteable: reaction, user_id: author_user.id) }
        let(:params) do
          {
            content: 'update test note sample',
            noteable_id: sample.id,
            noteable_type: 'Sample',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note1.id)
          expect([note.content, note.noteable_id,
                  note.noteable_type]).to eq(['update test note sample', sample.id, 'Sample'])
        end
      end

      context 'with reaction' do
        let(:note1) { create(:private_note, noteable: sample, user_id: author_user.id) }
        let(:params) do
          {
            content: 'update test note reaction',
            noteable_id: reaction.id,
            noteable_type: 'Reaction',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note1.id)
          puts "note:: #{note}"
          expect([note.content, note.noteable_id,
                  note.noteable_type]).to eq(['update test note reaction', reaction.id, 'Reaction'])
        end
      end

      context 'with screen' do
        let(:note1) { create(:private_note, noteable: sample, user_id: author_user.id) }
        let(:params) do
          {
            content: 'update test note screen',
            noteable_id: screen.id,
            noteable_type: 'Screen',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note1.id)
          puts "note:: #{note}"
          expect([note.content, note.noteable_id,
                  note.noteable_type]).to eq(['update test note screen', screen.id, 'Screen'])
        end
      end

      context 'with wellplate' do
        let(:note1) { create(:private_note, noteable: screen, user_id: author_user.id) }
        let(:params) do
          {
            content: 'update test note wellplate',
            noteable_id: wellplate.id,
            noteable_type: 'Wellplate',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note1.id)
          puts "note:: #{note}"
          expect([note.content, note.noteable_id,
                  note.noteable_type]).to eq(['update test note wellplate', wellplate.id, 'Wellplate'])
        end
      end

      context 'with research plan' do
        let(:note1) { create(:private_note, noteable: wellplate, user_id: author_user.id) }
        let(:params) do
          {
            content: 'update test note research plan',
            noteable_id: research_plan.id,
            noteable_type: 'ResearchPlan',
          }
        end

        before do
          put "/api/v1/private_notes/#{note1.id}", params: params
        end

        it "is able to update note's content" do
          note = PrivateNote.find(note1.id)
          puts "note:: #{note}"
          expect([note.content, note.noteable_id,
                  note.noteable_type]).to eq(['update test note research plan', research_plan.id, 'ResearchPlan'])
        end
      end
    end

    describe 'DELETE /api/v1/private_notes/:id' do
      let(:note1) do
        create(:private_note, content: 'test', noteable: reaction, user_id: author_user.id)
      end

      before do
        delete "/api/v1/private_notes/#{note1.id}"
      end

      it 'is able to delete private note' do
        note = PrivateNote.find_by(content: 'test')
        expect(note).to be_nil
      end
    end
  end
end
