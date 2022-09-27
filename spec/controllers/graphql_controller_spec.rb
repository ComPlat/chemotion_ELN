# frozen_string_literal: true

require 'rails_helper'

RSpec.describe GraphqlController, type: :controller do
  describe 'POST execute' do
    let(:variables) { nil }
    let(:query) { '' }
    let(:post_execute) do
      post :execute, params: { variables: variables, query: query, operationName: '' }
    end

    context 'when everything is okay' do
      before do
        allow(ChemotionSchema).to receive(:execute)
        post_execute
      end

      it 'returns http success' do
        expect(response).to have_http_status(:success)
      end

      it 'calls execute on ChemotionSchema' do
        expect(ChemotionSchema).to have_received(:execute)
      end
    end

    context 'when variables unexpected' do
      let(:variables) { 42 }

      it 'returns http unprocessable_entity' do
        post_execute
        expect(response).to have_http_status(:unprocessable_entity)
      end
    end

    context 'when variables are a hash' do
      let(:variables) { { x: 1, y: 2 } }

      it 'returns http success' do
        post_execute
        expect(response).to have_http_status(:success)
      end
    end

    context 'when there is any other error' do
      before do
        allow(ChemotionSchema).to receive(:execute).and_raise(StandardError)
        post_execute
      end

      it 'returns http internal server error' do
        expect(response).to have_http_status(:internal_server_error)
      end
    end

    context 'when application error' do
      before do
        allow(ChemotionSchema).to \
          receive(:execute).and_raise(Errors::ApplicationError)
        post_execute
      end

      it 'returns http ok' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns a error message' do
        error_message = JSON.parse(response.body)['errors'].first['message']
        expect(error_message).to eql('Errors::ApplicationError')
      end
    end

    context 'when resource not found' do
      before do
        allow(ChemotionSchema).to \
          receive(:execute).and_raise(ActiveRecord::RecordNotFound)
        post_execute
      end

      it 'returns http not_found' do
        expect(response).to have_http_status(:not_found)
      end
    end

    context 'when user not authorized' do
      before do
        allow(ChemotionSchema).to \
          receive(:execute).and_raise(Errors::AuthenticationError)
        post_execute
      end

      it 'returns http unauthorized' do
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when user is forbidden' do
      before do
        allow(ChemotionSchema).to \
          receive(:execute).and_raise(Errors::ForbiddenError.new('error message'))
        post_execute
      end

      it 'returns http ok' do
        expect(response).to have_http_status(:ok)
      end

      it 'returns a error message' do
        error_message = JSON.parse(response.body)['errors'].first['message']
        expect(error_message).to eql('error message')
      end
    end

    context 'when Rails.env is development and there is an error' do
      let(:variables) { 42 }

      before do
        allow(Rails.env).to receive(:development?).and_return(true)
        allow(Rails.logger).to receive(:error)
        post_execute
      end

      it 'logs some messages' do
        expect(Rails.logger).to have_received(:error).twice
      end
    end
  end
end
