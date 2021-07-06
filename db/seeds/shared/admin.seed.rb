attributes = {
  email: 'eln-admin@kit.edu',
  first_name: 'ELN',
  last_name: 'Admin',
  password: 'PleaseChangeYourPassword',
  name_abbreviation: 'ADM',
  type: 'Admin'
}

User.create!(attributes) unless User.find_by(type: 'Admin', name_abbreviation: 'ADM')

