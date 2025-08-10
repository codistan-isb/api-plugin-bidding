import getBidsbyAccountId from "../utils/getBidsbyAccountId.js";
import getBidbyAccountId from "../utils/getBidbyAccountId.js";
import getBidsbySellerId from "../utils/getBidsbySellerId.js";
import getRecentOffer from "../utils/getRecentOffer.js";
import getActiveBids from "../utils/getActiveBids.js";
import getNotificationByAccountId from "../utils/getNotificationByAccountId.js";
import getAccountByuserName from "../utils/getAccountByuserName.js";
import isAvailable from "../utils/isAvailable.js";
export default {
  async isAvailable(parent, args, context, info) {
    console.log("is available ");
    let response = await isAvailable(context, args);
    return response;
  },
  async getBidsbyAccountId(parent, args, context, info) {
    let accountId = context.userId;
    if (!accountId || accountId == null) {
      console.log("Unauthenticated user");
      throw new Error("Unauthenticated user");
    }
    let bids = await getBidsbyAccountId(context, args);
    return bids;
  },
  async getBidsbySellerId(parent, args, context, info) {
    let accountId = context.userId;
    if (!accountId || accountId == null) {
      console.log("Unauthenticated user");
      throw new Error("Unauthenticated user");
    }

    // Validate pagination parameters
    const { first = 20, after } = args;
    if (first < 1 || first > 100) {
      throw new Error("First parameter must be between 1 and 100");
    }

    let result = await getBidsbySellerId(context, args);
    return result;
  },
  async getRecentOffer(parent, args, context, info) {
    // Validate required parameters
    const { productId, variantId, first = 20, after } = args;

    if (!productId || !variantId) {
      throw new Error("Product ID and Variant ID are required");
    }

    // Validate pagination parameters
    if (first < 1 || first > 100) {
      throw new Error("First parameter must be between 1 and 100");
    }

    let result = await getRecentOffer(context, args);
    return result;
  },
  async getActiveBidOnProduct(parent, args, context, info) {
    let accountId = context.userId;
    if (!accountId || accountId == null) {
      console.log("Unauthenticated user");
      throw new Error("Unauthenticated user");
    }
    let activeBids = await getActiveBids(context, args.input);
    console.log("active bid", activeBids);
    let is_valid = false;

    if (activeBids) {
      console.log("inside fist if active bid");
      if (activeBids.acceptedOffer) {
        console.log("offer accepted");
        var d1 = new Date();
        var d2 = new Date(activeBids.acceptedOffer.validTill);
        console.log(d1.getTime() <= d2.getTime());
        if (d1.getTime() <= d2.getTime()) {
          is_valid = true;
        }
        if (is_valid) {
          console.log("offer valid");
          return {
            offer: activeBids.acceptedOffer,
            isValid: is_valid,
            bidId: activeBids._id,
          };
        } else {
          console.log("offer exist not valid");
          return null;
        }
      } else {
        console.log("bid exist offer not aqccepted");
        return { bidId: activeBids._id, offer: null, isValid: is_valid };
      }
    } else {
      console.log("no bid exist");
      return null;
    }
  },
  async getBidsbyUserId(parent, args, context, info) {
    console.log("getBidsbyUserList");
    let user_bid = await getBidbyAccountId(context, args);
    console.log("user_bid", user_bid);
    return user_bid;
  },
  async myNotifications(parent, args, context, info) {
    console.log("myNotifications");
    let myNotif = await getNotificationByAccountId(context);
    return myNotif;
  },
  async getUserByuserName(parent, args, context, info) {
    let account = await getAccountByuserName(context, args.userName);
    console.log("account", account);
    if (account) {
      return {
        userId: account.userId,
        userName: args.userName,
        name: account.name
          ? account.name
          : account.profile.name
          ? account.profile.name
          : null,
        profilePhoto: account.profile.picture,
        followerData: account.follower,
        followingData: account.following,
        canFollow:
          (account.follower &&
            account.follower.indexOf(context.userId) == -1) ||
          account.follower == undefined
            ? true
            : false,
        isVerified: account.profile.identityVerified ? true : false,
      };
    } else {
      throw new Error("User does not exist.");
    }
  },
};
