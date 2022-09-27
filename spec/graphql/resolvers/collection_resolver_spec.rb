# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Resolvers::CollectionResolver do
  it_behaves_like 'a secured graphql resolver'
  it_behaves_like 'a graphql resolver for single object' do
    let(:model_class) { Collection }
  end
end
