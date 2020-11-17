# frozen_string_literal: true

require 'rails_helper'

describe TokenAuthentication do
  let!(:person) { create(:person) }
  let!(:ak) { create(:authentication_key, user_id: person.id, token: 'qwerty', ip: '4.4.4.4/16') }

  context 'with proper headers, ' do
    before do
      get('/api/v1/public/ping', params: '', headers: { 'AUTHORIZATION' => 'Bearer qwerty' })
      @ta = described_class.new(request)
    end

    it 'finds the token in the header' do
      expect(@ta.token).to eq 'qwerty'
    end
    it 'finds the authentication_key' do
      expect(@ta.all_checks).to be true
      expect(@ta.is_successful?).to be true
    end
  end

  context 'with proper headers, with REMOTE_ADDR check,' do
    before do
      get('/api/v1/public/ping', params: '', headers: { 'AUTHORIZATION' => 'Bearer qwerty' })
      @ta = described_class.new(request, with_remote_addr: true)
    end

    it 'runs REMOTE_ADDR check' do
      expect(@ta.send(:check_keys)).to include :with_remote_addr
    end
    context 'with unauthorized origin,' do
      it 'is not successful' do
        expect(@ta.send(:with_remote_addr)).to be false
        expect(@ta.is_successful?).to be false
      end
    end

    context 'with authorized origin,' do
      before { @ta.key.update!(ip: '127.0.0.0/24') }

      it 'is successful' do
        expect(@ta.send(:with_remote_addr)).to be true
        expect(@ta.is_successful?).to be true
      end
    end
  end
end
