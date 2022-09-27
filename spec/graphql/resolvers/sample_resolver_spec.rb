# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Resolvers::SampleResolver do
  it_behaves_like 'a secured graphql resolver'
  it_behaves_like 'a graphql resolver for single object' do
    let(:model_class) { Sample }
  end
end
