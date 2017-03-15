namespace :data do
  desc "data modifications for 20161201152801_add_confirmable_to_devise"
  # confirm existing users (not mandatory)
  task ver_20161201152801: :environment do
    time_now = Time.now
    User.all.each do |user|
      user.confirmed_at = time_now
      user.save!
    end
  end
end
