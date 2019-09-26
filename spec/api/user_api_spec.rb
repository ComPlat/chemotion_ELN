# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::UserAPI do
  let(:json_options) do
    {
      only: %i[
        id type reaction_name_prefix email
        last_name first_name
      ],
      methods: %i[name initials is_templates_moderator]
    }
  end
  let(:srlzr) do
    { 'samples_count' => 0, 'reactions_count' => 0 }
  end
  let(:layout) do
    {
      'sample' => '1',
      'reaction' => '2',
      'wellplate' => '3',
      'screen' => '4',
      'research_plan' => '5'
    }
  end
  let(:usrext) do
    { 'confirmed_at' => nil, 'current_sign_in_at' => nil, 'email' => nil }
  end

  context 'authorized user-person logged in' do
    let!(:p1)  { create(:person, first_name: 'Jane', last_name: 'Doe') }
    let!(:p2)  { create(:person, first_name: 'John', last_name: 'Doe') }
    let!(:p3)  { create(:person, first_name: 'Jin',  last_name: 'Doe') }
    let!(:g1)  { create(:group, first_name: 'Doe', last_name: 'Group Test') }
    let!(:g2)  do
      create(
        :group, admins: [p1], users: [p1, p2],
                first_name: 'Doe', last_name: 'Group Test'
      )
    end
    let!(:g3) do
      create(:group, admins: [p1], first_name: 'Doe', last_name: 'Group Test')
    end
    let!(:g4) do
      create(
        :group, admins: [p2], users: [p2, p3],
                first_name: 'Doe', last_name: 'Group Test'
      )
    end

    before do
      allow_any_instance_of(WardenAuthentication).to receive(:current_user)
        .and_return(p1)
    end

    describe 'GET /api/v1/users/:name' do
      before do
        get "/api/v1/users/name.json?name=#{p1.last_name}"
      end

      it 'Returns all matched user names' do
        expect(
          JSON.parse(response.body)['users'].collect do |e|
            [e['id'], e['abb']]
          end
        ).to match_array(
          User.by_name(p1.last_name).where(type: %w[Person Group]).limit(3)
              .pluck(:id, :name_abbreviation)
        )

        # expect(
        #   JSON.parse(response.body)['users']
        # ).to match_array(
        #   [
        #     p1.as_json(json_options).merge(srlzr),
        #     p2.as_json(json_options).merge(srlzr),
        #     p3.as_json(json_options).merge(srlzr),
        #     g1.as_json(json_options).merge(srlzr).merge(
        #       users: g1.users.map do |s|
        #         UserSerializer.new(s).serializable_hash.deep_stringify_keys
        #       end
        #     ),
        #     g2.as_json(json_options).merge(srlzr).merge(
        #       users: g2.users.map do |s|
        #         UserSerializer.new(s).serializable_hash.deep_stringify_keys
        #       end
        #     ),
        #     g3.as_json(json_options).merge(srlzr).merge(
        #       users: g3.users.map do |s|
        #         UserSerializer.new(s).serializable_hash.deep_stringify_keys
        #       end
        #     ),
        #     g4.as_json(json_options).merge(srlzr).merge(
        #       users: g4.users.map do |s|
        #         UserSerializer.new(s).serializable_hash.deep_stringify_keys
        #       end
        #     )
        #   ]
        # )
      end
    end

    describe 'GET /api/v1/users/current' do
      before do
        get '/api/v1/users/current'
      end

      it 'Returns current user' do
        expect(JSON.parse(response.body)['user'].except('confirmed_at', 'current_sign_in_at', 'locked_at')).to(
          eq p1.as_json(json_options).merge(srlzr).merge('layout' => layout)
        )
      end
    end

    describe 'POST /api/v1/groups/create' do
      let(:params) do
        {
          'group_param' => {
            'first_name' => 'My', 'last_name' => 'Fanclub',
            'email' => 'jane.s@fan.club',
            'name_abbreviation' => 'JFC', 'users' => [p2.id]
          }
        }
      end

      before do
        post '/api/v1/groups/create', params
      end

      it 'Creates a group of persons' do
        expect(
          Group.where(
            last_name: 'Fanclub',
            first_name: 'My', name_abbreviation: 'JFC'
          )
        ).not_to be_empty
        expect(
          Group.find_by(name_abbreviation: 'JFC').users.pluck(:id)
        ).to match_array [p1.id, p2.id]
        expect(
          Group.find_by(name_abbreviation: 'JFC').admins
        ).not_to be_empty
        expect(
          Group.find_by(name_abbreviation: 'JFC').admins.first
        ).to eq p1
        expect(
          p1.administrated_accounts.where(name_abbreviation: 'JFC')
        ).not_to be_empty
      end
    end

    describe 'PUT /api/v1/groups/upd as a group admin' do
      let(:params) do
        {
          'rm_users' => [p1.id, p2.id],
          'add_users' => [p3.id]
        }
      end

      before do
        put "/api/v1/groups/upd/#{g2.id}", params
      end

      it 'Updates a group of persons' do
        expect(Group.find(g2.id).users.pluck(:id)).to match_array [p3.id]
      end
    end

    describe 'PUT /api/v1/groups/upd as a group admin (delete)' do
      let(:params) do
        {
          'destroy_group' => 'true'
        }
      end

      before do
        put "/api/v1/groups/upd/#{g3.id}", params
      end

      it 'Deletes a group of persons' do
        expect(Group.where(id: [g3.id])).to be_empty
        expect(Group.count).to eq(3)
      end
    end

    describe 'PUT /api/v1/groups/upd as a non group admin' do
      let(:params) do
        {
          'rm_users' => [p2.id, p3.id],
          'add_users' => [p1.id]
        }
      end

      before do
        put "/api/v1/groups/upd/#{g4.id}", params
      end

      it 'Does not update a group of persons' do
        expect(
          Group.find(g4.id).users.pluck(:id)
        ).to match_array([p2.id, p3.id])
      end
    end
  end
end
