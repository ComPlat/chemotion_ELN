# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Usecases::Vessels::Load do
  describe 'execute!' do
    context 'when loading parameter is by sample id' do
      context 'when data is not valid' do
        it 'error message delivered' do
        end

        it 'returned value is empty' do
        end
      end

      context 'when vessel does not exist' do
        it 'returned value is empty' do
        end
      end

      context 'when vessel does exist but user has no access' do
        it 'returned value is empty' do
        end
      end

      context 'when vessel does exist and user has access' do
        it 'returned value is vessel' do
        end
      end
    end

    context 'when loading parameter is "by collection id"' do
      context 'when data is not valid' do
        it 'error message delivered' do
        end

        it 'returned value is empty' do
        end
      end

      context 'when vessel does not exist' do
        it 'returned value is empty' do
        end
      end

      context 'when vessel does exist but user has no access' do
        it 'returned value is empty' do
        end
      end

      context 'when vessel exists and user has access' do
        it 'returned value is vessel' do
        end
      end
    end
  end
end