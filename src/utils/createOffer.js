import generateUID from "./generateUID.js";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
import coinToss from "./coinToss.js";
import getProductbyId from "./getProductbyId.js";
import createNotification from "./createNotification.js";
import { sendMessage } from "./sendMessage.js";

/**
 *
 * @method placeBidOnProduct
 * @summary Get all of a Unit's Variants or only a Unit's top level Variants.
 * @param {Object} context - an object containing the per-request state
 * @param {String} unitOrVariantId - A Unit or top level Unit Variant ID.
 * @param {Boolean} topOnly - True to return only a units top level variants.
 * @param {Object} args - an object of all arguments that were sent by the client
 * @param {Boolean} args.shouldIncludeHidden - Include hidden units in results
 * @param {Boolean} args.shouldIncludeArchived - Include archived units in results
 * @returns {Promise<Object[]>} Array of Unit Variant objects.
 */
function isSeller(context, bid_CreatedBy) {
  const { userId } = context;
  if (userId == bid_CreatedBy) {
    return false;
  } else {
    return true;
  }
}
export default async function createOffer(context, args) {
  const { collections, pubSub } = context;
  const { Bids, Cart } = collections;
  const { bidId, offer, to, type } = args;
  let accountId = context.userId;
  let coinResponse = null;
  let headUser = null;
  let tailUser = null;
  let valid_till = null;
  let winnerOffer,
    loserOffer = null;
  let winnerId,
    loserId = null;
  if (!bidId || bidId.length == 0) {
    throw new Error("bidId is required");
  }
  let bidExist = await Bids.findOne({ _id: bidId });

  if (!bidExist) {
    throw new Error("invalid bid ID");
  }
  let product = await getProductbyId(context, {
    productId: bidExist.productId,
  });

  let offerObj = {
    ...offer,
    type: type,
    createdBy: accountId,
    createdAt: new Date(),
    _id: await generateUID(),
    createdFor: to,
  };
  let bid_update = null;
  if (type == "counterOffer") {
    bid_update = await Bids.updateOne(
      { _id: bidId },
      {
        $addToSet: {
          offers: offerObj,
        },
        $set: {
          sellerOffer: isSeller(context, bidExist.createdBy)
            ? offerObj
            : bidExist.sellerOffer
              ? bidExist.sellerOffer
              : null,
          buyerOffer: !isSeller(context, bidExist.createdBy)
            ? offerObj
            : bidExist.buyerOffer
              ? bidExist.buyerOffer
              : null,
          activeOffer: offerObj,
          status: "inProgress",
          canAccept: to,
        },
      }
    );

    createNotification(context, {
      details: null,
      from: accountId,
      hasDetails: false,
      message: `Placed a new offer of ${offer.amount.amount} on ${product.product.title}`,
      status: "unread",
      to: to,
      type: "offer",
      url: `/en/chat?bidId=${bidExist._id}`,
    });
  } else if (type == "acceptedOffer") {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    valid_till = date;
    let cartExist = await Cart.findOne({ accountId: bidExist.createdBy });
    cartExist;
    if (cartExist && cartExist.items[0]) {
      console.log(
        "accept offer to check cart",
        cartExist.items[0]._id,
        bidExist.productId,
        cartExist.items[0].variantId == bidExist.variantId
      );
      let productExist = cartExist.items[0].variantId == bidExist.variantId;
      if (productExist) {
        let cart_update = await Cart.updateOne(
          { _id: cartExist._id },
          {
            $set: {
              "items.0.price.amount": bidExist.activeOffer.amount.amount,
              "items.0.subtotal.amount": bidExist.activeOffer.amount.amount,
            },
          }
        );
      }
    }
    const productTitle = product.product.slug;
    const productLink = `https://staging.bizb.store/products/${productTitle}`; // Adjust this URL format as needed
    const offerAmount = bidExist.activeOffer.amount.amount;

    const buyerMessage = `Dear buyer, your offer of PKR ${offerAmount} for "${productTitle}" has been accepted by the seller. Please purchase before it expires. View product: ${productLink}. Thanks`;
    console.log("buyerMessage", buyerMessage);
    await sendMessage(context, to, buyerMessage, null);
    createNotification(context, {
      details: null,
      from: accountId,
      hasDetails: false,
      message: `Accepted your offer of ${bidExist.activeOffer.amount.amount} on ${product.product.title}`,
      status: "unread",
      to: to,
      type: "offer",
      url: `/en/chat?bidId=${bidExist._id}`,
    });

    bid_update = await Bids.updateOne(
      { _id: bidId },
      {
        $addToSet: {
          offers: offerObj,
        },
        $set: {
          acceptedOffer: { ...bidExist.activeOffer, validTill: valid_till },
          acceptedBy: accountId,
          canAccept: null,
          acceptAction: "user_action",
          status: "closed",
        },
      }
    );
  } else if (type == "rejectOffer") {
    bid_update = await Bids.updateOne(
      { _id: bidId },
      {
        $addToSet: {
          offers: offerObj,
        },
        $set: {
          status: "closed",
        },
      }
    );
    const productTitle = product.product.slug;
    const productLink = `https://staging.bizb.store/products/${productTitle}`; // Adjust this URL format as needed
    const offerAmount = bidExist.activeOffer.amount.amount;
    const buyerMessage = `Dear buyer, your offer of PKR ${offerAmount} for "${productTitle}" has been rejected by the seller View product: ${productLink}. Thanks`;
    console.log("buyerMessage", buyerMessage);
    await sendMessage(context, to, buyerMessage, null)
  } else if (type == "gameRequest") {
    createNotification(context, {
      details: null,
      from: accountId,
      hasDetails: false,
      message: `Sent you a game request on ${product.product.title}`,
      status: "unread",
      to: to,
      type: "offer",
      url: `/en/chat?bidId=${bidExist._id}`,
    });

    bid_update = await Bids.updateOne(
      { _id: bidId },
      {
        $addToSet: {
          offers: offerObj,
        },
        $set: {
          gameCanAccept: to,
          activeOffer: offerObj,
          status: "inProgress",
        },
      }
    );
  } else if (type == "rejectedGame") {
    createNotification(context, {
      details: null,
      from: accountId,
      hasDetails: false,
      message: `Rejected your game request on ${product.product.title}`,
      status: "unread",
      to: to,
      type: "offer",
      url: `/en/chat?bidId=${bidExist._id}`,
    });

    bid_update = await Bids.updateOne(
      { _id: bidId },
      {
        $addToSet: {
          offers: offerObj,
        },
        $set: {
          gameCanAccept: null,
          activeGame: null,
        },
      }
    );
  } else if (type == "acceptedGame") {
    createNotification(context, {
      details: null,
      from: accountId,
      hasDetails: false,
      message: `Accepted your game request on ${product.product.title}`,
      status: "unread",
      to: to,
      type: "offer",
      url: `/en/chat?bidId=${bidExist._id}`,
    });
    if (offerObj.text.toLowerCase() == "head") {
      headUser = accountId;
      tailUser = to;
    } else {
      headUser = to;
      tailUser = accountId;
    }
    coinResponse = await coinToss(context);
    console.log("coin response", coinResponse, offerObj.text);
    if (coinResponse.toLowerCase() == offerObj.text.toLowerCase()) {
      winnerId = accountId;
      loserId = to;
    } else {
      winnerId = to;

      loserId = accountId;
    }

    if (winnerId == bidExist.createdBy) {
      winnerOffer = bidExist.buyerOffer ? bidExist.buyerOffer : null;
      loserOffer = bidExist.sellerOffer ? bidExist.sellerOffer : null;
      let date = new Date();
      date.setDate(date.getDate() + 1);
      valid_till = date;
      console.log("cartExist on ", bidExist.createdBy);
      let cartExist = await Cart.findOne({ accountId: bidExist.createdBy });
      console.log("cartExist", cartExist);
      if (cartExist && cartExist.items[0]) {
        console.log(
          "accept offer to check cart",
          cartExist.items[0].variantId,
          bidExist.variantId,
          cartExist.items[0].variantId == bidExist.variantId
        );

        let productExist = cartExist.items[0].variantId == bidExist.variantId;
        console.log("product Exist", productExist);
        if (productExist) {
          let cart_update = await Cart.updateOne(
            { _id: cartExist._id },
            {
              $set: {
                "items.0.price.amount": bidExist.activeOffer.amount.amount,
                "items.0.subtotal.amount": bidExist.activeOffer.amount.amount,
              },
            }
          );
          console.log("cart updated", cart_update);
        }
      }
      date = new Date();
      date.setDate(date.getDate() + 1);
      valid_till = date;
      bid_update = await Bids.updateOne(
        { _id: bidId },
        {
          $addToSet: {
            offers: offerObj,
          },
          $set: {
            gameCanAccept: null,
            acceptedGame: offerObj,
            gameAcceptedBy: accountId,
            gameAcceptedAt: new Date(),
            wonBy: winnerId,
            lostBy: loserId,
            acceptedOffer: { ...bidExist.buyerOffer, validTill: valid_till },
            acceptedBy: accountId,
            acceptAction: "game",
            canAccept: null,
            status: "closed",
          },
        }
      );
    } else {
      // game lost
      date = new Date();
      date.setDate(date.getDate() + 1);
      valid_till = date;
      loserOffer = bidExist.buyerOffer ? bidExist.buyerOffer : null;
      winnerOffer = bidExist.sellerOffer ? bidExist.sellerOffer : null;
      bid_update = await Bids.updateOne(
        { _id: bidId },
        {
          $addToSet: {
            offers: offerObj,
          },
          $set: {
            gameCanAccept: null,
            acceptedGame: offerObj,
            gameAcceptedBy: accountId,
            status: "closed",
            acceptedOffer: bidExist.sellerOffer
              ? { ...bidExist.sellerOffer, validTill: valid_till }
              : null,
            wonBy: winnerId,
            lostBy: loserId,
            gameAcceptedAt: new Date(),
          },
        }
      );
    }
  } else {
    createNotification(context, {
      details: null,
      from: accountId,
      hasDetails: false,
      message: `Sent you a new message on ${product.product.title}`,
      status: "unread",
      to: to,
      type: "offer",
      url: `/en/chat?bidId=${bidExist._id}`,
    });

    bid_update = await Bids.updateOne(
      { _id: bidId },
      {
        $addToSet: {
          offers: offerObj,
        },
        $set: {
          status: "inProgress",
        },
      }
    );
  }

  if (bid_update.modifiedCount) {
    if (type == "acceptedGame") {
      pubSub.publish(`StartGame ${bidId}`, {
        startCoinToss: {
          result: coinResponse,
          wonBy: winnerId,
          lostBy: loserId,
          data: "String",
          head: headUser,
          tail: tailUser,
          bidId: bidId,
          winnerOffer: winnerOffer,
          loserOffer: loserOffer,
        },
      });
    }
    pubSub.publish(`offers ${to}`, {
      offer: {
        offer: { ...offerObj, canAccept: to },
        offerType: type,
        canAccept: to,
        canAcceptGame: to,
        variantId: bidExist.variantId,
        productId: bidExist.productId,
        bidId: bidExist._id,
        userId: to,
      },
    });

    return { ...offerObj, canAccept: to };
  } else {
    throw new Error("Something went wrong");
  }
  // let new_id = await generateUID();
  //  let insert_obj = {
  //   _id: new_id,
  //   productId: decodeProductId,
  //   shopId: decodeShopId,
  //   createdBy: accountId,
  //   createdAt: new Date(),
  //   updatedAt: new Date(),
  //   status: "new",
  //   offers: [{ ...offer, createdBy: accountId }],
  // };
  // let BidsAdded = await Bids.insertOne(insert_obj);
  // if (BidsAdded.insertedId) {
  //   return BidsAdded.insertedId;
  //   // return Bids.findOne({"_id":BidsAdded.insertedId});
  // } else {
  //   throw new Error("Something went wrong");
  // }
  // return BidsAdded.insertedId;
  // return Products.find(selector).toArray();
}
