namespace :reactions do
  task populate_short_label: :environment do
    User.find_each do |u|
      counter = u.reactions.count
      u.counters["reactions"] = counter
      u.save!

      i = 1
      reactions = u.reactions.order('id ASC')
      reactions.each do |r|
        r.short_label = u.initials + "-R" + i.to_s
        r.save!
        i+=1
      end
    end
  end
end
