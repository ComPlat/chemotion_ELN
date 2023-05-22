# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::CellLines::Create do
  describe 'execute!' do
    context 'when data is not valid' do
      it 'error message delivered' do
      end

      it 'no cell line object was saved' do
      end
    end

    context 'when cell line material does already exist' do
      it 'cell line sample was saved' do
      end

      it 'new cell line material was not saved' do
      end
    end

    context 'when cell line material does not yet exist' do
      it 'cell line sample was saved' do
      end

      it 'new cell line material was saved' do
      end
    end
  end
end
