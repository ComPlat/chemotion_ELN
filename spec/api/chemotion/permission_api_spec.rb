# frozen_string_literal: true

require 'rails_helper'

# rubocop:disable Naming/VariableNumber, RSpec/NestedGroups
describe Chemotion::PermissionAPI do
  include_context 'api request authorization context'
  let(:other_user)                         { create(:person) }
  let(:unshared_collection_of_user)        { create(:collection, user: user) }
  let(:permission_level) { CollectionShare.permission_level(:pass_ownership) }
  let(:shared_collection_of_other_user) do
    create(:collection, user: other_user).tap do |collection|
      create(:collection_share, collection: collection, permission_level: permission_level, shared_with: user)
    end
  end

  describe 'POST /api/v1/permissions/sharing' do
    context 'when requesting status for regular elements in own collection' do
      let(:reaction_1) { create(:reaction, collections: [unshared_collection_of_user]) }
      let(:wellplate_1) { create(:wellplate, collections: [unshared_collection_of_user]) }
      let(:screen_1) { create(:screen, collections: [unshared_collection_of_user]) }

      let!(:params) do
        {
          currentCollection: { id: unshared_collection_of_user.id },
          sample: {
            checkedAll: true,
            checkedIds: [],
            uncheckedIds: [],
          },
          reaction: {
            checkedAll: true,
            checkedIds: [],
            uncheckedIds: [reaction_1.id],
          },
          wellplate: {
            checkedAll: false,
            checkedIds: [wellplate_1.id],
            uncheckedIds: [],
          },
          screen: {
            checkedAll: false,
            checkedIds: [screen_1.id],
            uncheckedIds: [],
          },
        }
      end

      it 'responds with true if sharing allowed' do
        post '/api/v1/permissions/status', params: params

        expect(response.status).to eq 201
        expected_result = {
          'is_top_secret' => false,
          'sharing_allowed' => true,
          'deletion_allowed' => true,
          'remove_allowed' => true,
          'update_allowed' => true,
        }
        expect(parsed_json_response).to eq expected_result
      end
    end

    context 'when a top secret element is selected' do
      let(:sample) { create(:sample, collections: [unshared_collection_of_user]) }
      let(:top_secret_sample) { create(:sample, is_top_secret: true, collections: [unshared_collection_of_user]) }

      let(:params) do
        {
          currentCollection: { id: unshared_collection_of_user.id },
          sample: {
            checkedAll: false,
            checkedIds: [sample.id, top_secret_sample.id],
            uncheckedIds: [],
          },
        }
      end

      it 'returns is_top_secret=true' do
        post '/api/v1/permissions/status', params: params

        expect(response.status).to eq 201
        expected_result = {
          'is_top_secret' => true,
          'sharing_allowed' => true,
          'deletion_allowed' => true,
          'remove_allowed' => true,
          'update_allowed' => true,
        }
        expect(parsed_json_response).to eq expected_result
      end
    end

    # The top-secret flag must also be raised when the secret sample is not selected directly but
    # is reachable through a selected reaction, wellplate, or screen. These exercise the joined
    # EXISTS queries that replaced the per-element association walk (refs: #2783).
    context 'when a top secret sample is reachable only through a selected container' do
      let(:top_secret_sample) { create(:sample, is_top_secret: true, collections: [unshared_collection_of_user]) }

      it 'detects it through a selected reaction' do
        reaction = create(:reaction, collections: [unshared_collection_of_user])
        reaction.products << top_secret_sample
        post '/api/v1/permissions/status', params: {
          currentCollection: { id: unshared_collection_of_user.id },
          reaction: { checkedAll: false, checkedIds: [reaction.id], uncheckedIds: [] },
        }

        expect(parsed_json_response['is_top_secret']).to be true
      end

      it 'detects it through a selected screen (two association levels down)' do
        wellplate = create(:wellplate, collections: [unshared_collection_of_user])
        create(:well, wellplate: wellplate, sample: top_secret_sample)
        screen = create(:screen, wellplates: [wellplate], collections: [unshared_collection_of_user])
        post '/api/v1/permissions/status', params: {
          currentCollection: { id: unshared_collection_of_user.id },
          screen: { checkedAll: false, checkedIds: [screen.id], uncheckedIds: [] },
        }

        expect(parsed_json_response['is_top_secret']).to be true
      end
    end

    # Regression guard: the top-secret check must issue a fixed number of queries no matter how many
    # containers are selected. The old code walked `flat_map(&:samples)` one SELECT per reaction, so
    # the count grew with the selection. On an own collection the sharing-policy block is skipped, so
    # the query count isolates the top-secret check.
    context 'when many containers are selected (N+1 guard)' do
      # Count only the top-secret probe queries (they filter on samples.is_top_secret). The old code
      # walked one SELECT per selected container, so this count grew with the selection; the joined
      # EXISTS makes it exactly one, whatever the count.
      def count_top_secret_probes(&block)
        count = 0
        counter = lambda do |_name, _start, _finish, _id, payload|
          count += 1 if payload[:sql].include?('is_top_secret')
        end
        ActiveSupport::Notifications.subscribed(counter, 'sql.active_record', &block)
        count
      end

      def post_status(element, records)
        post '/api/v1/permissions/status', params: {
          currentCollection: { id: unshared_collection_of_user.id },
          element => { checkedAll: false, checkedIds: records.map(&:id), uncheckedIds: [] },
        }
      end

      it 'probes for a top secret sample once through the reactions, whether 1 or 5 are selected' do
        one = create_list(:reaction, 1, collections: [unshared_collection_of_user])
        five = create_list(:reaction, 5, collections: [unshared_collection_of_user])

        expect(count_top_secret_probes { post_status(:reaction, one) }).to eq(1)
        expect(count_top_secret_probes { post_status(:reaction, five) }).to eq(1)
      end

      # The deepest path (screen -> wellplate -> well -> sample). The old code walked two nested
      # flat_maps per screen; the single joined EXISTS must stay one query regardless of count.
      it 'probes for a top secret sample once through the screens, whether 1 or 5 are selected' do
        one = create_list(:screen, 1, collections: [unshared_collection_of_user])
        five = create_list(:screen, 5, collections: [unshared_collection_of_user])

        expect(count_top_secret_probes { post_status(:screen, one) }).to eq(1)
        expect(count_top_secret_probes { post_status(:screen, five) }).to eq(1)
      end
    end

    context 'when requesting permission status for elements of a shared collection' do
      let(:sample) { create(:sample, collections: [shared_collection_of_other_user]) }
      let(:params) do
        {
          currentCollection: { id: shared_collection_of_other_user.id },
          sample: {
            checkedAll: false,
            checkedIds: [sample.id],
            uncheckedIds: [],
          },
        }
      end

      before do
        post '/api/v1/permissions/status', params: params
      end

      # Destroying element records is owner-only, so `deletion_allowed` is false at every shared rung.
      # A sharee at :remove_elements may unlink elements from the collection, which is a different
      # operation (CollectionElementsAPI), not mass deletion.
      context 'when the permission level is the highest non-ownership rung' do
        let(:permission_level) { CollectionShare.permission_level(:manage_shares) }

        it 'returns deletion_allowed=false and sharing_allowed=true' do
          expect(parsed_json_response['deletion_allowed']).to be false
          expect(parsed_json_response['sharing_allowed']).to be true
        end
      end

      context 'when the permission level allows removing elements from the collection' do
        let(:permission_level) { CollectionShare.permission_level(:remove_elements) }

        it 'returns remove_allowed=true (unlink is granted) but deletion_allowed=false (destroy is owner-only)' do
          expect(parsed_json_response['remove_allowed']).to be true
          expect(parsed_json_response['deletion_allowed']).to be false
          expect(parsed_json_response['sharing_allowed']).to be true
        end
      end

      context 'when the permission level is only sufficient for sharing elements onward' do
        let(:permission_level) { CollectionShare.permission_level(:add_elements) }

        it 'returns remove_allowed=false, deletion_allowed=false and sharing_allowed=true' do
          expect(parsed_json_response['remove_allowed']).to be false
          expect(parsed_json_response['deletion_allowed']).to be false
          expect(parsed_json_response['sharing_allowed']).to be true
        end
      end

      context 'when the permission level is too low' do
        let(:permission_level) { CollectionShare.permission_level(:edit_elements) }

        it 'returns deletion_allowed=false and sharing_allowed=false' do
          expect(parsed_json_response['deletion_allowed']).to be false
          expect(parsed_json_response['sharing_allowed']).to be false
        end

        it 'returns update_allowed=true (editing element content is granted at :edit_elements)' do
          expect(parsed_json_response['update_allowed']).to be true
        end
      end

      context 'when the permission level is read only' do
        let(:permission_level) { CollectionShare.permission_level(:read_elements) }

        it 'returns update_allowed=false so bulk user-label edits are forbidden' do
          expect(parsed_json_response['update_allowed']).to be false
          expect(parsed_json_response['sharing_allowed']).to be false
          expect(parsed_json_response['deletion_allowed']).to be false
        end
      end

      # Regression (S5): element types outside the legacy [Sample, Reaction, Screen, Wellplate] set
      # must be policed too — otherwise a sharee selecting only such an element keeps the permissive
      # default (remove_allowed/deletion_allowed = true) and the UI offers a Move/Remove the server
      # then refuses.
      context 'when the selection is only a research plan (an element type outside the legacy four)' do
        let(:research_plan) { create(:research_plan, collections: [shared_collection_of_other_user]) }
        let(:permission_level) { CollectionShare.permission_level(:add_elements) }
        let(:params) do
          {
            currentCollection: { id: shared_collection_of_other_user.id },
            research_plan: { checkedAll: false, checkedIds: [research_plan.id], uncheckedIds: [] },
          }
        end

        it 'polices the research plan: remove_allowed=false and deletion_allowed=false at :add_elements' do
          expect(parsed_json_response['remove_allowed']).to be false
          expect(parsed_json_response['deletion_allowed']).to be false
        end
      end

      # An empty selection on a shared collection must report every flag false. Otherwise the
      # permissive defaults survive (the policing loops skip empty scopes) and the client's
      # PermissionStore caches a stale "true" that briefly enables Split/Share on the next selection.
      context 'when no element type is selected' do
        let(:permission_level) { CollectionShare.permission_level(:manage_shares) }
        let(:params) do
          {
            currentCollection: { id: shared_collection_of_other_user.id },
            sample: { checkedAll: false, checkedIds: [], uncheckedIds: [] },
          }
        end

        it 'returns deletion_allowed, sharing_allowed, remove_allowed and update_allowed all false' do
          aggregate_failures do
            expect(parsed_json_response['deletion_allowed']).to be false
            expect(parsed_json_response['sharing_allowed']).to be false
            expect(parsed_json_response['remove_allowed']).to be false
            expect(parsed_json_response['update_allowed']).to be false
          end
        end
      end
    end
  end
end
# rubocop:enable Naming/VariableNumber, RSpec/NestedGroups
