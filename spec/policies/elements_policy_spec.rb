# frozen_string_literal: true

require 'rails_helper'

RSpec.describe ElementsPolicy do
  let(:u1) { create(:person, first_name: 'User', last_name: 'One') }
  let(:u2) { create(:person, first_name: 'User', last_name: 'Two') }

  let(:g1) { create(:group, first_name: 'Group', users: [u1, u2], last_name: 'One Two') }

  let(:c1) { create(:collection, user_id: u1.id, is_shared: nil, permission_level: 0, label: "#{u1.name}'s collection") }
  let(:c2) { create(:collection, user_id: u2.id, is_shared: nil, permission_level: 0, label: "#{u2.name}'s collection") }
  let(:c1_2) { create(:collection, user_id: u1.id, is_shared: true, permission_level: 0, shared_by_id: u2.id, label: "#{u2.name} share to #{u1.name}") }
  let(:c2_1) { create(:collection, user_id: u2.id, is_shared: true, permission_level: 0, shared_by_id: u1.id, label: "#{u1.name} share to #{u2.name}") }
  let(:cg1_2) { create(:collection, user_id: g1.id, is_shared: true, permission_level: 0, shared_by_id: u2.id, label: "#{u2.name} share to #{g1.name}") }

  let(:s1) { create(:sample, name: 'sample 1') }
  let(:s2) { create(:sample, name: 'sample 2') }
  let(:s3) { create(:sample, name: 'sample 3') }

  let(:samples_1) { Sample.where(id: [s1.id]) }
  let(:samples_2) { Sample.where(id: [s1.id, s2.id]) }
  let(:samples_3) { Sample.where(id: [s1.id, s2.id, s3.id]) }

  let(:ep_1) { described_class.new(u1, samples_1) }
  let(:ep_2) { described_class.new(u1, samples_2) }
  let(:ep_3) { described_class.new(u1, samples_3) }

  let(:pl_read) {   0 }
  let(:pl_write) {  1 }
  let(:pl_share) {  2 }
  let(:pl_destroy) { 3 }
  let(:pl_import) { 4 }
  let(:pl_own) {    5 }

  describe 'permission for records of 1 sample' do
    context 'only in a owned collection' do
      before do
        CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
      end

      it 'enables sharing the sample' do
        expect(ep_1.share?).to be true
      end

      it 'enables destroying the sample' do
        expect(ep_1.destroy?).to be true
      end
    end

    context 'in a owned collection and in a collection shared to someone with no permission' do
      before do
        CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: c2_1.id, sample_id: s1.id)
      end

      it 'enables sharing the sample' do
        expect(ep_1.share?).to be true
      end

      it 'enables destroying the sample' do
        expect(ep_1.destroy?).to be true
      end
    end

    context 'in a owned collection and in a collection shared by someone with no permission' do
      before do
        CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: c1_2.id, sample_id: s1.id)
      end

      it 'enables sharing the sample' do
        expect(ep_1.share?).to be true
      end

      it 'enables destroying the sample' do
        expect(ep_1.destroy?).to be true
      end
    end

    context 'in a collection only, shared by someone' do
      before do
        CollectionsSample.create!(collection_id: c1_2.id, sample_id: s1.id)
      end

      context 'with permission_level below share' do
        before do
          c1_2.update!(permission_level: 1)
        end

        it 'prevents sharing the sample' do
          expect(ep_1.share?).to be false
        end

        it 'prevents destroying the sample' do
          expect(ep_1.destroy?).to be false
        end
      end

      context 'with share permission_level' do
        before do
          c1_2.update!(permission_level: 2)
        end

        it 'enables sharing the sample' do
          expect(ep_1.share?).to be true
        end

        it 'prevents destroying the sample' do
          expect(ep_1.destroy?).to be false
        end
      end

      context 'with destroy permission_level' do
        before do
          c1_2.update!(permission_level: 3)
        end

        it 'enables sharing the sample' do
          expect(ep_1.share?).to be true
        end

        it 'enables destroying the sample' do
          expect(ep_1.destroy?).to be true
        end
      end
    end

    context 'in a collection only, shared by someone to a common group' do
      before do
        CollectionsSample.create!(collection_id: cg1_2.id, sample_id: s1.id)
      end

      context 'with permission_level below share' do
        before do
          cg1_2.update!(permission_level: 1)
        end

        it 'prevents sharing the sample' do
          expect(ep_1.share?).to be false
        end

        it 'prevents destroying the sample' do
          expect(ep_1.destroy?).to be false
        end
      end

      context 'with share permission_level' do
        before do
          cg1_2.update!(permission_level: 2)
        end

        it 'enables sharing the sample' do
          expect(ep_1.share?).to be true
        end

        it 'prevents destroying the sample' do
          expect(ep_1.destroy?).to be false
        end
      end

      context 'with destroy permission_level' do
        before do
          cg1_2.update!(permission_level: 3)
        end

        it 'enables sharing the sample' do
          expect(ep_1.share?).to be true
        end

        it 'enables destroying the sample' do
          expect(ep_1.destroy?).to be true
        end
      end
    end

    context 'only in soelse owned collection' do
      before do
        CollectionsSample.create!(collection_id: c2.id, sample_id: s1.id)
      end

      it 'prevents sharing the sample' do
        expect(ep_1.share?).to be false
      end

      it 'prevents destroying the sample' do
        expect(ep_1.destroy?).to be false
      end
    end
  end

  describe 'permission for records of 2 samples' do
    context '1 in a collection shared by so and 1 in a owned collection and in a collection shared to so' do
      before do
        CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: c2_1.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: c1_2.id, sample_id: s2.id)
      end

      context 'with permission_level below share' do
        before do
          c1_2.update!(permission_level: 1)
        end

        it 'prevents sharing the sample' do
          expect(ep_2.share?).to be false
        end

        it 'prevents destroying the sample' do
          expect(ep_2.destroy?).to be false
        end
      end

      context 'with share permission_level' do
        before do
          c1_2.update!(permission_level: 2)
        end

        it 'enables sharing the sample' do
          expect(ep_2.share?).to be true
        end

        it 'prevents destroying the sample' do
          expect(ep_2.destroy?).to be false
        end
      end

      context 'with destroy permission_level' do
        before do
          c1_2.update!(permission_level: 3)
        end

        it 'enables sharing the sample' do
          expect(ep_2.share?).to be true
        end

        it 'enables destroying the sample' do
          expect(ep_2.destroy?).to be true
        end
      end
    end

    context '1 in a collection shared by so to a common group and 1 in a owned collection and in a collection shared to so' do
      before do
        CollectionsSample.create!(collection_id: c1.id,   sample_id: s1.id)
        CollectionsSample.create!(collection_id: c2_1.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: cg1_2.id, sample_id: s2.id)
      end

      context 'with permission_level below share' do
        before do
          cg1_2.update!(permission_level: 1)
        end

        it 'prevents sharing the sample' do
          expect(ep_2.share?).to be false
        end

        it 'prevents destroying the sample' do
          expect(ep_2.destroy?).to be false
        end
      end

      context 'with share permission_level' do
        before do
          cg1_2.update!(permission_level: 2)
        end

        it 'enables sharing the sample' do
          expect(ep_2.share?).to be true
        end

        it 'prevents destroying the sample' do
          expect(ep_2.destroy?).to be false
        end
      end

      context 'with destroy permission_level' do
        before do
          cg1_2.update!(permission_level: 3)
        end

        it 'enables sharing the sample' do
          expect(ep_2.share?).to be true
        end

        it 'enables destroying the sample' do
          expect(ep_2.destroy?).to be true
        end
      end
    end

    context '1 in a collection shared by so and 1 in a owned collection' do
      before do
        CollectionsSample.create!(collection_id: c1.id, sample_id: s1.id)
        CollectionsSample.create!(collection_id: c1_2.id, sample_id: s2.id)
      end

      context 'with permission_level below read (-1<0)' do
        before do
          c1_2.update!(permission_level: -1)
        end

        it 'prevents reading the sample' do
          expect(ep_2.allowed?(pl_read)).to be false
        end
      end

      context 'with permission_level above read (0>=0)' do
        before do
          c1_2.update!(permission_level: 0)
        end

        it 'enables reading the sample' do
          expect(ep_2.allowed?(pl_read)).to be true
        end
        it 'prevents writing of the sample' do
          expect(ep_2.allowed?(pl_write)).to be false
        end
      end

      context 'with permission_level above write (1>=1)' do
        before do
          c1_2.update!(permission_level: 1)
        end

        it 'enables writing of the sample' do
          expect(ep_2.allowed?(pl_write)).to be true
        end

        it 'prevents sharing the sample' do
          expect(ep_2.allowed?(pl_share)).to be false
        end
      end

      context 'with permission_level above share (2>=2)' do
        before do
          c1_2.update!(permission_level: 2)
        end

        it 'enables sharing the sample' do
          expect(ep_2.allowed?(pl_share)).to be true
        end

        it 'prevents destroying the sample' do
          expect(ep_2.allowed?(pl_destroy)).to be false
        end
      end

      context 'with permission_level above destroy (3>=3)' do
        before do
          c1_2.update!(permission_level: 3)
        end

        it 'enables destroying the sample' do
          expect(ep_2.allowed?(pl_destroy)).to be true
        end

        it 'prevents importing the sample' do
          expect(ep_2.allowed?(pl_import)).to be false
        end
      end

      context 'with permission_level above import (4>=4)' do
        before do
          c1_2.update!(permission_level: 4)
        end

        it 'enables importing the sample' do
          expect(ep_2.allowed?(pl_import)).to be true
        end

        it 'prevents owning the sample' do
          expect(ep_2.allowed?(pl_own)).to be false
        end
      end

      context 'with permission_level above own (5>=5)' do
        before do
          c1_2.update!(permission_level: 5)
        end

        it 'enables owning the sample' do
          expect(ep_2.allowed?(pl_own)).to be true
        end
      end
    end
  end

  describe 'permission for records of 3 samples' do
    context '1 in a collection shared by so and 1 in a owned collection and in 1 a collection shared to so' do
      before do
        CollectionsSample.create!(collection_id: c1.id,   sample_id: s1.id)
        CollectionsSample.create!(collection_id: c1.id,   sample_id: s2.id)
        CollectionsSample.create!(collection_id: c2_1.id, sample_id: s2.id)
        CollectionsSample.create!(collection_id: c1_2.id, sample_id: s3.id)
      end

      context 'with permission_level below share' do
        before do
          c1_2.update!(permission_level: 1)
        end

        it 'prevents sharing the sample' do
          expect(ep_3.share?).to be false
        end

        it 'prevents destroying the sample' do
          expect(ep_3.destroy?).to be false
        end
      end

      context 'with share permission_level' do
        before do
          c1_2.update!(permission_level: 2)
        end

        it 'enables sharing the sample' do
          expect(ep_3.share?).to be true
        end

        it 'prevents destroying the sample' do
          expect(ep_3.destroy?).to be false
        end
      end

      context 'with destroy permission_level' do
        before do
          c1_2.update!(permission_level: 3)
        end

        it 'enables sharing the sample' do
          expect(ep_3.share?).to be true
        end

        it 'enables destroying the sample' do
          expect(ep_3.destroy?).to be true
        end
      end
    end

    context '1 in a collection shared by so to a common group and 1 in a owned collection and 1 in a collection shared to so' do
      before do
        CollectionsSample.create!(collection_id: c1.id,   sample_id: s1.id)
        CollectionsSample.create!(collection_id: c1.id,   sample_id: s2.id)
        CollectionsSample.create!(collection_id: c2_1.id, sample_id: s2.id)
        CollectionsSample.create!(collection_id: cg1_2.id, sample_id: s3.id)
      end

      context 'with permission_level below share' do
        before do
          cg1_2.update!(permission_level: 1)
        end

        it 'prevents sharing the sample' do
          expect(ep_3.share?).to be false
        end

        it 'prevents destroying the sample' do
          expect(ep_3.destroy?).to be false
        end
      end

      context 'with share permission_level' do
        before do
          cg1_2.update!(permission_level: 2)
        end

        it 'enables sharing the sample' do
          expect(ep_3.share?).to be true
        end

        it 'prevents destroying the sample' do
          expect(ep_3.destroy?).to be false
        end
      end

      context 'with destroy permission_level' do
        before do
          cg1_2.update!(permission_level: 3)
        end

        it 'enables sharing the sample' do
          expect(ep_3.share?).to be true
        end

        it 'enables destroying the sample' do
          expect(ep_3.destroy?).to be true
        end
      end
    end
  end
end
