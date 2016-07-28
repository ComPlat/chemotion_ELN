require 'rails_helper'

describe Chemotion::UserAPI do
  let(:json_options) {
    {
      only: [:id,:is_templates_moderator],
      methods: [:name, :initials]
    }
  }
  let(:srlzr){
    {'samples_count' => 0, 'reactions_count'=>0}
  }

  context 'authorized user-person logged in' do
    let!(:p1)  { create(:person, first_name: 'Jane', last_name: 'Doe') }
    let!(:p2)  { create(:person, first_name: 'John', last_name: 'Doe') }
    let!(:p3)  { create(:person, first_name: 'Jin',  last_name: 'Doe') }
    let!(:g1)  { create(:group)}
    let!(:g2)  { create(:group, admins: [p1], users:[p1,p2])}
    let!(:g3)  { create(:group, admins: [p1])}
    let!(:g4)  { create(:group, admins: [p2], users:[p2,p3])}

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user).and_return(p1)
    end

    describe 'GET /api/v1/users/' do
      before do
        get "/api/v1/users/"
      end
      it "Returns all users" do
        expect(JSON.parse(response.body)['users'].collect{|e| [e['id'],e['initials']]}).to match_array(User.all.pluck(:id, :name_abbreviation))

      #  expect(JSON.parse(response.body)['users']).to match_array([
      #    p1.as_json(json_options).merge(srlzr),
      #    p2.as_json(json_options).merge(srlzr),
      #    p3.as_json(json_options).merge(srlzr),
      #    g1.as_json(json_options).merge(srlzr).merge({users: g1.users.map{|s|
      #      UserSerializer.new(s).serializable_hash.deep_stringify_keys}}),
      #    g2.as_json(json_options).merge(srlzr).merge({users: g2.users.map{|s|
      #      UserSerializer.new(s).serializable_hash.deep_stringify_keys}}),
      #    g3.as_json(json_options).merge(srlzr).merge({users: g3.users.map{|s|
      #      UserSerializer.new(s).serializable_hash.deep_stringify_keys}}),
      #    g4.as_json(json_options).merge(srlzr).merge({users: g4.users.map{|s|
      #      UserSerializer.new(s).serializable_hash.deep_stringify_keys}})
      #  ])
      end
    end

    describe 'GET /api/v1/users/current' do
      before do
        get "/api/v1/users/current"
      end
      it "Returns current user" do
        #expect(JSON.parse(response.body)).to eq user.as_json(json_options)
        expect(JSON.parse(response.body)['user']).to eq p1.as_json(json_options).merge(srlzr)
      end
    end

    describe 'POST /api/v1/groups/create' do
      let(:params){
        { "group_param" => {
            "first_name" => "My",
            "last_name" =>  "Fanclub",
            "email" =>      "jane.s@fan.club",
          #  "password" => "dummypassword",
          #  "password_confirmation" => "dummypassword",
            "name_abbreviation" => "JFC",
            "users" => [p2.id]
          }
        }
      }
      before do
        post "/api/v1/groups/create", params
      end
      it "Creates a group of persons" do
        expect(Group.where(email:"jane.s@fan.club",last_name:"Fanclub" , first_name:"My", name_abbreviation: "JFC")).to_not be_empty
        expect(Group.where(email:"jane.s@fan.club").last.users.pluck :id).to match_array [p1.id, p2.id]
        expect(Group.where(email:"jane.s@fan.club").last.admins).to_not be_empty
        expect(Group.where(email:"jane.s@fan.club").last.admins.first).to eq p1
        expect(p1.administrated_accounts.where(email:"jane.s@fan.club")).not_to be_empty
      end
    end

    describe 'PUT /api/v1/groups/upd as a group admin' do
      let(:params){
        {
          "rm_users"  => [p1.id,p2.id],
          "add_users" => [p3.id]
        }
      }
      before do
        put "/api/v1/groups/upd/#{g2.id}", params
      end
      it "Updates a group of persons" do
        expect(Group.find(g2.id).users.pluck :id).to match_array [p3.id]
      end
    end

    describe 'PUT /api/v1/groups/upd as a group admin (delete)' do
      let(:params){
        {
          "destroy_group" => 'true'
        }
      }
      before do
        put "/api/v1/groups/upd/#{g3.id}", params
      end
      it "Deletes a group of persons" do
        expect(Group.where(id: [g3.id])).to be_empty
        expect(Group.count).to eq(3)
      end
    end

    describe 'PUT /api/v1/groups/upd as a non group admin' do
      let(:params){
        {
          "rm_users"  => [p2.id,p3.id],
          "add_users" => [p1.id]
        }
      }
      before do
        put "/api/v1/groups/upd/#{g4.id}", params
      end
      it "Does not update a group of persons" do
        expect(Group.find(g4.id).users.pluck :id).to match_array([p2.id,p3.id])
      end
    end

  end
end
