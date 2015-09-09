require 'rails_helper'

# TODO test permissions in API specs
RSpec.describe Authorization do
  describe "#get_request_valid?" do
    let(:user) { create(:user) }
    let(:env)  { {'REQUEST_METHOD' => 'GET'} }

    context "user is not owner of every requested collection nor shared it" do
      let(:c1)     { create(:collection, user: user) }
      let(:c2)     { create(:collection, user_id: user.id + 1, shared_by_id: user.id) }
      let(:c3)     { create(:collection, user_id: user.id + 1, shared_by_id: user.id + 1) }

      # TODO wie heißt param sonst, falls es mehrere collections sind?
      let(:params) { {collection_ids: [c1.id, c2.id, c3.id]} }

      subject      { described_class.new(user, env, params) }

      it "returns false" do
        expect(subject.send(:get_request_valid?)).to eq false
      end
    end

    context "user is owner every requested collection or shared it" do
      let(:c1)     { create(:collection, user: user) }
      let(:c2)     { create(:collection, user_id: user.id + 1, shared_by_id: user.id) }

      let(:params) { {collection_ids: [c1.id, c2.id]} }

      subject      { described_class.new(user, env, params) }

      it "returns true" do
        expect(subject.send(:get_request_valid?)).to eq true
      end
    end
  end

  describe "#post_request_valid?" do
    let(:user) { create(:user) }

    context "user wants to create a resource" do
      let(:env) { {'REQUEST_METHOD' => 'POST', 'REQUEST_PATH' => '/api/v1/collections'} }
      subject   { described_class.new(user, env, {}) }

      it "returns true" do
        expect(subject.send(:post_request_valid?)).to eq true
      end
    end

    context "user wants to share shared resources but has unsufficient permission levels" do
      let(:env)    { {'REQUEST_METHOD' => 'POST', 'REQUEST_PATH' => '/api/v1/collections/shared'} }
      let(:c1)     { create(:collection, user: user, is_shared: true, permission_level: 0) }
      let(:c2)     { create(:collection, user: user, is_shared: true, permission_level: 3) }
      let(:c3)     { create(:collection, user: user, is_shared: true, permission_level: 2) }

      let(:params) { {collection_ids: [c1.id, c2.id, c3.id]} }

      subject      { described_class.new(user, env, params) }

      it "returns false" do
        expect(subject.send(:post_request_valid?)).to eq false
      end
    end

    context "user wants to share shared resources and has sufficient permission levels" do
      let(:env)    { {'REQUEST_METHOD' => 'POST', 'REQUEST_PATH' => '/api/v1/collections/shared'} }
      let(:c1)     { create(:collection, user: user, is_shared: true, permission_level: 4) }
      let(:c2)     { create(:collection, user: user, is_shared: true, permission_level: 3) }
      let(:c3)     { create(:collection, user: user, is_shared: true, permission_level: 2) }

      let(:params) { {collection_ids: [c1.id, c2.id, c3.id]} }

      subject      { described_class.new(user, env, params) }

      it "returns true" do
        expect(subject.send(:post_request_valid?)).to eq true
      end
    end

    context "user wants to share resources which he owns and are not tagged as shared" do
      let(:env)  { {'REQUEST_METHOD' => 'POST', 'REQUEST_PATH' => '/api/v1/collections/shared'} }
      let(:c1)     { create(:collection, user: user, is_shared: false, permission_level: 0) }
      let(:c2)     { create(:collection, user: user, is_shared: false, permission_level: 3) }

      let(:params) { {collection_ids: [c1.id, c2.id]} }

      subject      { described_class.new(user, env, params) }

      it "returns true" do
        expect(subject.send(:post_request_valid?)).to eq true
      end
    end
  end

  describe "#put_request_valid?" do
    let(:user) { create(:user) }
    let(:env)  { {'REQUEST_METHOD' => 'PUT'} }

    context "user is not owner of every requested collection or has not an appropriate permission level" do
      let(:c1)     { create(:collection, user: user, permission_level: 0) }
      let(:c2)     { create(:collection, user: user, permission_level: 1) }
      let(:c3)     { create(:collection, user_id: user.id + 1, permission_level: 1) }

      let(:params) { {collection_ids: [c1.id, c2.id, c3.id]} }

      subject      { described_class.new(user, env, params) }

      it "returns false" do
        expect(subject.send(:put_request_valid?)).to eq false
      end
    end

    context "user is owner every requested collection and has at least permission level 1" do
      let(:c1)     { create(:collection, user: user, permission_level: 1) }
      let(:c2)     { create(:collection, user: user, permission_level: 3) }

      let(:params) { {collection_ids: [c1.id, c2.id]} }

      subject      { described_class.new(user, env, params) }

      it "returns true" do
        expect(subject.send(:put_request_valid?)).to eq true
      end
    end
  end
end
