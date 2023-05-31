# frozen_string_literal: true

require 'rails_helper'

RSpec.shared_examples 'an unauthorized response' do
  it 'returns 401 status code' do
    expect(response).to have_http_status(:unauthorized)
  end
end

describe Chemotion::CommentAPI do
  let!(:unauthorized_user) { create(:person) }
  let!(:authorized_user) { create(:person) }
  let!(:other_user) { create(:person) }
  let(:group) do
    create(:group, first_name: 'Group', users: [authorized_user, other_user], last_name: 'One Two',
                   name_abbreviation: 'G1_2x')
  end

  let!(:unshared_collection) do
    create(:collection, user_id: authorized_user.id, is_shared: false, is_locked: false, permission_level: 0,
                        label: "authorized_user's unshared collection")
  end
  let!(:shared_collection) do
    create(:collection, user_id: other_user.id, shared_by_id: authorized_user.id, is_shared: true, is_locked: true,
                        permission_level: 0, label: 'shared by authorized_user')
  end
  let(:shared_collection_to_group) do
    create(:collection, user_id: group.id, is_shared: true, shared_by_id: authorized_user.id, is_locked: true,
                        permission_level: 0, label: 'shared by authorized_user to group')
  end
  let(:sync_collection) do
    create(:collection, user_id: authorized_user.id, is_shared: false, is_synchronized: true,
                        label: 'synchronized by authorized_user')
  end

  let(:sync_collections_user) do
    create(:sync_collections_user, collection_id: sync_collection.id, user_id: other_user.id, permission_level: 0,
                                   shared_by_id: authorized_user.id, fake_ancestry: sync_collection.id.to_s)
  end

  let!(:unshared_sample) { create(:sample, name: 'Unshared sample', collections: [unshared_collection]) }
  let!(:shared_sample) { create(:sample, collections: [unshared_collection, shared_collection]) }
  let!(:shared_sample_for_group) { create(:sample, collections: [unshared_collection, shared_collection_to_group]) }
  let!(:sync_sample) { create(:sample, collections: [unshared_collection, sync_collection]) }

  let!(:unshared_reaction) { create(:reaction, name: 'Unshared reaction', collections: [unshared_collection]) }
  let!(:shared_reaction) { create(:reaction, collections: [unshared_collection, shared_collection]) }

  let(:comment_of_unshared_sample) do
    create(:comment, content: 'test comment for unshared_sample', commentable_id: unshared_sample.id,
                     commentable_type: 'Sample', section: Comment.sample_sections[:properties],
                     created_by: authorized_user.id)
  end
  let(:comment_of_shared_sample) do
    create(:comment, content: 'test comment for shared_sample', commentable_id: shared_sample.id,
                     commentable_type: 'Sample', section: Comment.sample_sections[:properties],
                     created_by: authorized_user.id)
  end
  let(:comment_of_shared_sample1) do
    create(:comment, content: 'test comment for shared_sample by other user', commentable_id: shared_sample.id,
                     commentable_type: 'Sample', section: Comment.sample_sections[:properties],
                     created_by: other_user.id)
  end
  let(:comment_of_shared_sample_for_group) do
    create(:comment, content: 'test comment for shared_sample for group', commentable_id: shared_sample_for_group.id,
                     commentable_type: 'Sample', section: Comment.sample_sections[:properties],
                     created_by: authorized_user.id)
  end
  let(:comment_of_sync_sample) do
    create(:comment, content: 'test comment for sync_sample', commentable_id: sync_sample.id,
                     commentable_type: 'Sample', section: Comment.sample_sections[:properties],
                     created_by: authorized_user.id)
  end

  let(:comment_of_unshared_reaction) do
    create(:comment, content: 'test comment for unshared reaction', commentable: unshared_reaction,
                     commentable_type: 'Reaction', section: Comment.reaction_sections[:scheme],
                     created_by: authorized_user.id)
  end
  let(:comment_of_shared_reaction) do
    create(:comment, content: 'test comment for shared reaction', commentable: shared_reaction,
                     commentable_type: 'Reaction', section: Comment.reaction_sections[:scheme],
                     created_by: authorized_user.id)
  end
  let(:comment_of_shared_reaction1) do
    create(:comment, content: 'test comment for shared reaction by other user', commentable: shared_reaction,
                     commentable_type: 'Reaction', section: Comment.reaction_sections[:scheme],
                     created_by: other_user.id)
  end

  let(:warden_authentication_instance) { instance_double(WardenAuthentication) }

  context 'when the user is unauthorized' do
    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
      allow(warden_authentication_instance).to receive(:current_user).and_return(unauthorized_user)
    end

    describe 'GET /api/v1/comments/:id' do
      context 'when the comment element is not shared' do
        before do
          get "/api/v1/comments/#{comment_of_unshared_sample.id}"
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'when the comment element shared but not with the logged in user' do
        before do
          get "/api/v1/comments/#{comment_of_shared_sample.id}"
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'when the comment is shared with another group' do
        before do
          get "/api/v1/comments/#{comment_of_shared_sample_for_group.id}"
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'when the comment is from an unaccesible synchronized collection' do
        before do
          get "/api/v1/comments/#{comment_of_sync_sample.id}"
        end

        it_behaves_like 'an unauthorized response'
      end
    end

    describe 'PUT /api/v1/comments/:id' do
      context 'when the comment element is not shared' do
        before do
          put "/api/v1/comments/#{comment_of_unshared_sample.id}", params: { content: 'test comment' }
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'when the comment element shared but not with the logged in user' do
        before do
          put "/api/v1/comments/#{comment_of_shared_sample.id}", params: { content: 'test comment' }
        end

        it_behaves_like 'an unauthorized response'
      end
    end

    describe 'DELETE /api/v1/comments/:id' do
      context 'when the comment element is not shared' do
        before do
          delete "/api/v1/comments/#{comment_of_unshared_sample.id}"
        end

        it_behaves_like 'an unauthorized response'
      end

      context 'when the comment element shared but not with the logged in user' do
        before do
          delete "/api/v1/comments/#{comment_of_shared_sample.id}"
        end

        it_behaves_like 'an unauthorized response'
      end
    end
  end

  context 'when user is authorized' do
    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
      allow(warden_authentication_instance).to receive(:current_user).and_return(authorized_user)
    end

    describe 'GET /api/v1/comments/:id' do
      it 'returns comment data' do
        get "/api/v1/comments/#{comment_of_unshared_sample.id}"

        comment_data = JSON.parse(response.body)['comment']&.symbolize_keys
        expect(comment_data[:id]).to eq(comment_of_unshared_sample.id)
      end

      it 'returns comment data when the element is shared with group' do
        get "/api/v1/comments/#{comment_of_shared_sample_for_group.id}"

        comment_data = JSON.parse(response.body)['comment']&.symbolize_keys
        expect(comment_data[:id]).to eq(comment_of_shared_sample_for_group.id)
      end

      it 'returns comment data when the element is from synchronized collection' do
        get "/api/v1/comments/#{comment_of_sync_sample.id}"

        comment_data = JSON.parse(response.body)['comment']&.symbolize_keys
        expect(comment_data[:id]).to eq(comment_of_sync_sample.id)
      end
    end

    describe 'POST /api/v1/comments/create' do
      context 'with sample' do
        let(:params) do
          {
            content: 'test comment sample',
            commentable_id: shared_sample.id,
            commentable_type: 'Sample',
            section: Comment.sample_sections[:properties],
          }
        end

        it 'creates a new comment associated with the sample' do
          post '/api/v1/comments/create', params: params

          comment = Comment.find_by(content: 'test comment sample')
          expect(comment).not_to be_nil
          expect(comment.commentable_id).to eq(shared_sample.id)
        end
      end

      context 'with reaction' do
        let(:params) do
          {
            content: 'test comment reaction',
            commentable_id: shared_reaction.id,
            commentable_type: 'Reaction',
            section: Comment.reaction_sections[:scheme],
          }
        end

        it 'creates a new comment associated with the reaction' do
          post '/api/v1/comments/create', params: params

          comment = Comment.find_by(content: 'test comment reaction')
          expect(comment).not_to be_nil
          expect(comment.commentable_id).to eq(shared_reaction.id)
        end
      end
    end

    describe 'PUT /api/v1/comments/:id' do
      context 'with own comment' do
        it "updates comment's content" do
          put "/api/v1/comments/#{comment_of_shared_sample.id}", params: { content: 'updated test comment' }

          expect do
            comment_of_shared_sample.reload
          end.to change(comment_of_shared_sample, :content).to('updated test comment')
        end
      end

      context 'with sample' do
        let(:params) do
          {
            content: 'update test comment sample',
            commentable_id: shared_sample.id,
            commentable_type: 'Sample',
          }
        end

        it "updates comment's content and association" do
          put "/api/v1/comments/#{comment_of_shared_sample.id}", params: params

          comment = Comment.find(comment_of_shared_sample.id)
          expect([comment.content, comment.commentable_id,
                  comment.commentable_type]).to eq(['update test comment sample', shared_sample.id, 'Sample'])
        end
      end

      context 'with reaction' do
        let(:params) do
          {
            content: 'update test comment reaction',
            commentable_id: shared_reaction.id,
            commentable_type: 'Reaction',
            section: Comment.reaction_sections[:scheme],
          }
        end

        it "updates comment's content and association" do
          put "/api/v1/comments/#{comment_of_shared_reaction.id}", params: params

          comment = Comment.find(comment_of_shared_reaction.id)
          expect([comment.content, comment.commentable_id,
                  comment.commentable_type]).to eq(['update test comment reaction', shared_reaction.id, 'Reaction'])
        end
      end
    end

    describe 'DELETE /api/v1/comments/:id' do
      it 'deletes own comment' do
        expect do
          delete "/api/v1/comments/#{comment_of_shared_reaction.id}"
        end.to change { Comment.exists?(comment_of_shared_reaction.id) }.from(true).to(false)
      end

      context 'when deletes other user comments in own collection' do
        before do
          delete "/api/v1/comments/#{comment_of_shared_reaction1.id}"
        end

        it_behaves_like 'an unauthorized response'
      end
    end
  end

  context 'when user has access to a shared/synchronized collection owned by another user' do
    before do
      allow(WardenAuthentication).to receive(:new).and_return(warden_authentication_instance)
      allow(warden_authentication_instance).to receive(:current_user).and_return(other_user)
    end

    describe 'GET /api/v1/comments/:id' do
      context 'when the comment is from another user' do
        before do
          get "/api/v1/comments/#{comment_of_unshared_sample.id}"
        end

        it_behaves_like 'an unauthorized response'
      end

      it 'returns comment data' do
        get "/api/v1/comments/#{comment_of_shared_sample.id}"

        comment_data = JSON.parse(response.body)['comment']&.symbolize_keys
        expect(comment_data[:id]).to eq(comment_of_shared_sample.id)
      end

      it 'returns comment data when the element is shared with group' do
        get "/api/v1/comments/#{comment_of_shared_sample_for_group.id}"

        comment_data = JSON.parse(response.body)['comment']&.symbolize_keys
        expect(comment_data[:id]).to eq(comment_of_shared_sample_for_group.id)
      end
    end

    describe 'POST /api/v1/comments/create' do
      context 'with content' do
        let(:params) do
          {
            content: 'test comment',
            commentable_id: shared_reaction.id,
            commentable_type: 'Reaction',
            section: Comment.reaction_sections[:scheme],
          }
        end

        before do
          post '/api/v1/comments/create', params: params
        end

        it 'creates a new comment (on accessible element)' do
          comment = Comment.find_by(content: 'test comment')
          expect(comment).not_to be_nil
        end
      end

      context 'with sample' do
        let(:params) do
          {
            content: 'test comment sample',
            commentable_id: shared_sample.id,
            commentable_type: 'Sample',
            section: Comment.sample_sections[:properties],
          }
        end

        it 'creates a new comment associated with the sample' do
          post '/api/v1/comments/create', params: params

          comment = Comment.find_by(content: 'test comment sample')
          expect(comment).not_to be_nil
          expect(comment.commentable_id).to eq(shared_sample.id)
        end
      end

      context 'with reaction' do
        let(:params) do
          {
            content: 'test comment reaction',
            commentable_id: shared_reaction.id,
            commentable_type: 'Reaction',
            section: Comment.reaction_sections[:scheme],
          }
        end

        it 'creates a new comment associated with the reaction' do
          post '/api/v1/comments/create', params: params

          comment = Comment.find_by(content: 'test comment reaction')
          expect(comment).not_to be_nil
          expect(comment.commentable_id).to eq(shared_reaction.id)
        end
      end
    end

    describe 'PUT /api/v1/comments/:id' do
      context 'when the comment is from another user' do
        before do
          put "/api/v1/comments/#{comment_of_shared_sample.id}", params: { content: 'update test comment' }
        end

        it_behaves_like 'an unauthorized response'
      end

      it 'updates own comment' do
        put "/api/v1/comments/#{comment_of_shared_sample1.id}", params: { content: 'update test comment' }

        expect do
          comment_of_shared_sample1.reload
        end.to change(comment_of_shared_sample1, :content).to('update test comment')
      end

      it 'resolves comment from another user' do
        put "/api/v1/comments/#{comment_of_shared_sample.id}", params: { status: 'Resolved',
                                                                         content: comment_of_shared_sample.content }

        expect do
          comment_of_shared_sample.reload
        end.to change(comment_of_shared_sample, :status).to('Resolved')
      end

      it 'resolves own comment' do
        put "/api/v1/comments/#{comment_of_shared_sample1.id}", params: { status: 'Resolved',
                                                                          content: comment_of_shared_sample1.content }

        expect do
          comment_of_shared_sample1.reload
        end.to change(comment_of_shared_sample1, :status).to('Resolved')
      end
    end

    describe 'DELETE /api/v1/comments/:id' do
      context 'when the comment is from another user' do
        before do
          delete "/api/v1/comments/#{comment_of_shared_sample.id}"
        end

        it_behaves_like 'an unauthorized response'
      end

      it 'deletes own comment' do
        expect do
          delete "/api/v1/comments/#{comment_of_shared_sample1.id}"
        end.to change { Comment.exists?(comment_of_shared_sample1.id) }.from(true).to(false)
      end
    end
  end
end
