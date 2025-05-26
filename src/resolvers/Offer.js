import getProductbyId from "../utils/getProductbyId.js";
import getAccountById from "../utils/getAccountById.js";
export default {

  async sender(parent, args, context, info) {
    let account = await getAccountById(context, parent.createdBy)
    console.log("account", account);
    return {
      name: account ? account.name
        ? account.name
        : account.profile.name
          ? account.profile.name
          : account.username
            ? account.username
            : account.profile.username
              ? account.profile.username
              : "LoS"
        : "LoS",
      image: account ? account.profile.picture : null,
    };
  },
  async reciever(parent, args, context, info) {
    console.log('parent.createdFor', parent.createdFor)
    let account = await getAccountById(context, parent.createdFor)
    console.log("account", account);

    return {
      name: account ? account.name
        ? account.name
        : account.profile.name
          ? account.profile.name
          : account.username
            ? account.username
            : account.profile.username
              ? account.profile.username
              : "LoS"
        : "LoS"
      ,
      image: account ? account.profile.picture : null,
    };
  },
  //   },
};
