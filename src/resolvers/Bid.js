import getVariantbyId from "../utils/getVariantbyId.js";
import getAccountById from "../utils/getAccountById.js";
export default {
  //   Bid: {
  async product(parent, args, context, info) {
    // console.log("bid product called",parent);
    let cat_product = await getVariantbyId(context, parent);
    return cat_product;
  },

  async createdByinfo(parent, args, context, info) {
    let account = await getAccountById(context, parent.createdBy);
    return {
      name: account.username
        ? account.username
        : account.profile.username
        ? account.profile.username
        : account.name
        ? account.name
        : account.profile.name
        ? account.profile.name
        : "LoS",
      image: account.profile.picture,
    };
  },
  async soldByInfo(parent, args, context, info) {
    let account = await getAccountById(context, parent.soldBy);
    return {
      name: account.username
        ? account.username
        : account.profile.username
        ? account.profile.username
        : account.name
        ? account.name
        : account.profile.name
        ? account.profile.name
        : "LoS",
      image: account.profile.picture,
    };
  },
  //   },
};
