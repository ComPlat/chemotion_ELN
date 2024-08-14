attributes = {
  email: 'eln-admin@kit.edu',
  first_name: 'ELN',
  last_name: 'Admin',
  password: 'PleaseChangeYourPassword',
  name_abbreviation: 'ADM',
  type: 'Admin'
}

user = User.find_by(type: 'Admin', name_abbreviation: 'ADM') || User.create!(attributes) 
user.update!(account_active: true)
user.update!(confirmed_at: DateTime.now)

