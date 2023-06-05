# frozen_string_literal: true

require 'rails_helper'

RSpec.describe 'CalendarEntry' do
  describe 'creation' do
    # Test each factory
    it 'is possible to create a valid calendar_entry' do
      factory = build(:calendar_entry)
      expect(factory.valid?).to be true
    end

    # Test each trait
    FactoryBot.factories[:calendar_entry].definition.defined_traits.map(&:name).each do |trait_name|
      it "is possible to create a valid #{trait_name} calendar_entry" do
        factory = build(:calendar_entry, trait_name)
        expect(factory.valid?).to be true
      end
    end
  end

  describe 'deletion' do
    it 'is possible to delete a calendar_entry' do
      factory = create(:calendar_entry)
      factory.destroy
      expect { factory.reload }.to raise_error(ActiveRecord::RecordNotFound)
    end

    # Test each trait
    FactoryBot.factories[:calendar_entry].definition.defined_traits.map(&:name).each do |trait_name|
      it "is possible to delete a #{trait_name} calendar entry without deleting the associated #{trait_name}" do
        factory = create(:calendar_entry, trait_name)
        factory.destroy
        eventable = factory.eventable

        expect { factory.reload }.to raise_error(ActiveRecord::RecordNotFound)
        expect(eventable.reload).to eq eventable
      end
    end

    it 'associated calendar_entry_notifications are delete during calendar entry deletion' do
      calendar_entry_notification = create(:calendar_entry_notification)
      calendar_entry_notification.calendar_entry.destroy

      expect { calendar_entry_notification.reload }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end

  describe 'for_range' do
    it 'returns entries in affected range' do
      start_time = Time.current.beginning_of_day
      end_time = 1.day.from_now.end_of_day

      affected_entry1 = create(:calendar_entry, start_time: start_time, end_time: end_time)
      affected_entry2 = create(:calendar_entry, start_time: start_time + 5.hours, end_time: end_time - 5.hours)

      # after end_time
      _unaffected_entry1 = create(:calendar_entry, start_time: end_time + 1.second, end_time: end_time + 5.hours)
      # before start_time
      _unaffected_entry2 = create(:calendar_entry, start_time: start_time - 5.hours, end_time: start_time - 1.second)

      expect(CalendarEntry.for_range(start_time, end_time).pluck(:id).sort).to eq [
        affected_entry1.id,
        affected_entry2.id,
      ].sort
    end
  end

  describe 'for_event' do
    it 'returns entries for a specific event' do
      sample = create(:sample)

      affected_entry1 = create(:calendar_entry, :sample, eventable: sample)
      affected_entry2 = create(:calendar_entry, :sample, eventable: sample)

      _unaffected_entry1 = create(:calendar_entry)
      _unaffected_entry7 = create(:calendar_entry, :sample)
      _unaffected_entry2 = create(:calendar_entry, :reaction)
      _unaffected_entry3 = create(:calendar_entry, :wellplate)
      _unaffected_entry4 = create(:calendar_entry, :screen)
      _unaffected_entry5 = create(:calendar_entry, :research_plan)
      _unaffected_entry6 = create(:calendar_entry, :element)

      expect(CalendarEntry.for_event(sample.id, sample.class.to_s).pluck(:id).sort).to eq [
        affected_entry1.id,
        affected_entry2.id,
      ].sort
    end
  end

  describe 'for_user' do
    it 'returns entries created by user' do
      person = create(:person)

      affected_entry1 = create(:calendar_entry, :sample, creator: person)
      affected_entry2 = create(:calendar_entry, :reaction, creator: person)

      _unaffected_entry1 = create(:calendar_entry)
      _unaffected_entry7 = create(:calendar_entry, :sample)
      _unaffected_entry2 = create(:calendar_entry, :reaction)
      _unaffected_entry3 = create(:calendar_entry, :wellplate)
      _unaffected_entry4 = create(:calendar_entry, :screen)
      _unaffected_entry5 = create(:calendar_entry, :research_plan)
      _unaffected_entry6 = create(:calendar_entry, :element)

      expect(CalendarEntry.for_user(person.id).pluck(:id).sort).to eq [
        affected_entry1.id,
        affected_entry2.id,
      ].sort
    end
  end

  describe 'notified_users' do
    it 'contains only notified users for a specific entry' do
      entry = create(:calendar_entry)

      user1 = create(:person, first_name: 'Test1', last_name: 'Test1')
      user2 = create(:person, first_name: 'Test2', last_name: 'Test2')

      entry_notification1 = create(:calendar_entry_notification, calendar_entry: entry, user: user1)
      entry_notification2 = create(:calendar_entry_notification, status: 1, user: user2)

      notified_users = entry.notified_users

      expect(notified_users).to include(entry_notification1.user.name)
      expect(notified_users).not_to include(entry_notification2.user.name)
      expect(notified_users).to include(entry_notification1.status)
    end
  end

  describe 'ical_for' do
    it 'returns a string containing ical content for a specific user' do
      entry = create(:calendar_entry, :sample, title: 'TestTitle')

      creator = entry.creator
      sample = entry.eventable

      collection = create(:collection, user_id: creator.id)
      sample.collections_samples.create(collection_id: collection.id)

      ical = entry.ical_for(creator).delete("\r\n ") # ical breaks lines in the middle of sentences

      expect(ical).to include('TestTitle')
      expect(ical).to include(entry.link_to_element_for(creator))
    end
  end

  describe 'link_to_element_for' do
    it 'returns a string containing a reaction link for a specific user' do
      entry = create(:calendar_entry, :reaction)

      creator = entry.creator
      reaction = entry.eventable

      collection = create(:collection, user_id: creator.id)
      reaction.collections_reactions.create(collection_id: collection.id)

      link = entry.link_to_element_for(creator)

      expect(link).to include("http://localhost:3000/mydb/collection/#{collection.id}/reaction/#{reaction.id}")
    end
  end

  describe 'create_messages' do
    it 'create notifications for users for a specific type' do
      entry = create(:calendar_entry, :reaction)

      reaction = entry.eventable

      user1 = create(:person)
      collection1 = create(:collection, user_id: user1.id)
      reaction.collections_reactions.create(collection_id: collection1.id)

      user2 = create(:person)
      collection2 = create(:collection, user_id: user2.id)
      reaction.collections_reactions.create(collection_id: collection2.id)

      Channel.create_with(
        channel_type: 8,
        msg_template: {
          data: '%{creator_name} %{type} calendar entry %{kind}: %{range} %{title}.',
          action: 'CalendarActions.navigateToElement',
          eventable_type: '%{eventable_type}',
          eventable_id: '%{eventable_id}',
        },
      ).find_or_create_by(subject: Channel::CALENDAR_ENTRY)

      expect { entry.create_messages([user1.id, user2.id], :created) }.to change(Message, :count).by(2)
    end
  end

  describe 'send_emails' do
    it 'send email to users for a specific type' do
      entry = create(:calendar_entry, :reaction)

      reaction = entry.eventable

      user1 = create(:person)
      collection1 = create(:collection, user_id: user1.id)
      reaction.collections_reactions.create(collection_id: collection1.id)

      user2 = create(:person)
      collection2 = create(:collection, user_id: user2.id)
      reaction.collections_reactions.create(collection_id: collection2.id)

      expect { entry.send_emails([user1.id, user2.id], 'created') }.to change {
        ActionMailer::Base.deliveries.count
      }.by(2)
    end
  end

  describe 'collection_for' do
    it 'returns the first collection or syn collection that contains this entry of a given user' do
      entry = create(:calendar_entry, :reaction)

      reaction = entry.eventable
      creator = entry.creator

      collection = create(:collection, user_id: creator.id)
      reaction.collections_reactions.create(collection_id: collection.id)

      another_user = create(:person)

      sync_user = create(:person)
      sync_collection = collection.sync_collections_users.create(user: sync_user, sharer: creator)

      expect(entry.collection_for(creator)).to eq collection
      expect(entry.collection_for(another_user)).to be_nil
      expect(entry.collection_for(sync_user)).to eq sync_collection
    end
  end

  describe 'range' do
    it 'returns a string containing entries range' do
      entry = create(:calendar_entry, :reaction)

      expect(entry.range).to include(I18n.l(entry.start_time, format: :eln_timestamp))
    end
  end
end
