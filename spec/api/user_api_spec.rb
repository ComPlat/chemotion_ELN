# frozen_string_literal: true

require 'rails_helper'

describe Chemotion::UserAPI do
  let(:json_options) do
    {
      only: %i[
        id type reaction_name_prefix email matrix
        last_name first_name
      ],
      methods: %i[name initials is_templates_moderator molecule_editor account_active]
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
        expect(JSON.parse(response.body)['user'].except('confirmed_at', 'current_sign_in_at', 'locked_at', 'unconfirmed_email','counters')).to(
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
        post '/api/v1/groups/create', params: params
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
        put "/api/v1/groups/upd/#{g2.id}", params: params
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
        put "/api/v1/groups/upd/#{g3.id}", params: params, as: :json
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
        put "/api/v1/groups/upd/#{g4.id}", params: params, as: :json
      end

      it 'Does not update a group of persons' do
        expect(
          Group.find(g4.id).users.pluck(:id)
        ).to match_array([p2.id, p3.id])
      end
    end

    describe 'POST /api/v1/users/token' do
      let(:params) do
        {
          'client_id' => '1',
          'client_name' => '3rd App'
        }
      end

      before do
        post '/api/v1/users/token', params: params
      end

      it 'Grant permission for 3rd App' do
        expect(
          JSON.parse(response.body)
        ).not_to be_empty

        expect(
          Token.where(client_id: '1', user_id: p1.id)
        ).not_to be_empty

        expect(
          JsonWebToken.decode(JSON.parse(response.body)['token'])['client_id']
        ).to eq('1')

        expect(
          JsonWebToken.decode(JSON.parse(response.body)['token'])['current_user_id']
        ).to eq(p1.id)

        expect(
          JsonWebToken.decode(JSON.parse(response.body)['refresh_token'])
        ).not_to be_empty
      end
    end

    describe 'DELETE /api/v1/users/token/refresh_token' do
      let(:token) { create(:token, user_id: p1.id) }

      before do
        delete '/api/v1/users/token/' + token[:id].to_s
      end

      it 'Delete token by id' do
        expect(
          JSON.parse(response.body)
        ).not_to be_empty

        expect(
          Token.where(client_id: '123', user_id: p1.id)
        ).to be_empty

        cache = Moneta::Adapters::Memcached.new if cache.nil?

        expect(
          cache[token[:token]]
        ).to eq(p1['id'].to_s)
      end
    end

    describe 'POST /api/v1/users/token/refresh_token' do
      let(:token) {
        create(
          :token,
          client_id: '123',
          user_id: p1.id,
          token: JsonWebToken.encode(client_id: '123', current_user_id: p1.id, exp: 1.hours.from_now),
          refresh_token: JsonWebToken.encode(client_id: '123', current_user_id: p1.id, exp: 1.weeks.from_now)
        )}
      let(:params) do
        {
          'refresh_token' => token.refresh_token
        }
      end

      before do
        post '/api/v1/users/token/refresh_token', params: params
      end

      it 'Generate new token' do
        expect(
          JSON.parse(response.body)
        ).not_to be_empty

        expect(
          Token.where(client_id: '123', user_id: p1.id)
        ).not_to be_empty

        expect(
          JsonWebToken.decode(JSON.parse(response.body)['token'])['client_id']
        ).to eq('123')

        expect(
          JsonWebToken.decode(JSON.parse(response.body)['token'])['current_user_id']
        ).to eq(p1.id)

        expect(
          JsonWebToken.decode(JSON.parse(response.body)['refresh_token'])
        ).not_to be_empty
      end
    end
  end
end
