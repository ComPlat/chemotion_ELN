# create initial test user
u = User.create!(email: 'test@ninjaconcept.com', password: 'ninjaconcept', password_confirmation: 'ninjaconcept')

# create some collections
root_1 = Collection.create!(label: 'All', user_id: u.id)
root_2 = Collection.create!(label: 'Root #2', user_id: u.id)
child = Collection.create!(label: 'Child of Root #2', user_id: u.id, parent: root_2)
grand_child = Collection.create!(label: 'Grandchild', user_id: u.id, parent: child)
