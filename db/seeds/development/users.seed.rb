user_cnt = 6
password = '@complat'

user_cnt.times do |idx|
  uc = idx + 1
  !User.find_by(email: "complat.user#{uc}@eln.edu") && User.create!(
    email: "complat.user#{uc}@eln.edu", password: password, first_name: "User#{uc}", last_name: 'Complat',
    name_abbreviation: "CU#{uc}", confirmed_at: Time.now
  )
end
