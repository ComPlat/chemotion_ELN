import { types } from 'mobx-state-tree';



export const AttachmentNotificationStore = types
 .model({ name: 'default User',})
 .views((self) => ({
    test() {
        return "Hello "+self.name;
      }
   }))
 .actions((self) =>({

    testState(newName) {
        self.name = newName+"   "+new Date();
      }
 }))