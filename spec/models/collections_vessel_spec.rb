# frozen_string_literal: true

require 'rails_helper'

RSpec.describe CollectionsVessel do
  it_behaves_like 'acts_as_paranoid soft-deletable model'

  it { is_expected.to belong_to(:collection) }
  it { is_expected.to belong_to(:vessel) }
end
