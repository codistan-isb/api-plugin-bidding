import generateUID from "./generateUID.js";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
import createNotification from "./createNotification.js";
import getProductbyId from "./getProductbyId.js";
import getAccountById from "./getAccountById.js";
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
export default async function
  placeBidOnProduct(context, args) {
  const { collections, pubSub } = context;
  const { Bids } = collections;
  const {
    shopId,
    productId,
    offer,
    variantId,
    soldby,
    offerType,
    productPrice,
  } = args;
  let accountId = context.userId;
  let decodeProductId = decodeOpaqueId(productId).id;
  let decodeVariantId = decodeOpaqueId(variantId).id;
  let decodeShopId = decodeOpaqueId(shopId).id;
  if (decodeProductId == productId || productId.length == 0) {
    throw new Error("ProductId must be a Reaction ID");
  }
  if (decodeVariantId == variantId || variantId.length == 0) {
    throw new Error("variantId must be a Reaction ID");
  }
  if (decodeShopId == shopId || shopId.length == 0) {
    throw new Error("shopId must be a Reaction ID");
  }
  let new_id = await generateUID();
  if (decodeProductId == productId || productId.length == 0) {
    throw new Error("ProductId must be a Reaction ID");
  }
  let contactExists = await Bids.findOne({
    $and: [{ createdBy: accountId }, { soldBy: soldby }],
  });
  let product = await getProductbyId(context, { productId: decodeProductId });
  let offer_obj = {
    ...offer,
    createdBy: accountId,
    _id: await generateUID(),
    createdFor: soldby,
    createdAt: new Date(),
    type: offerType,
  };
  let offer_seller = {
    amount: productPrice,
    text: "Original price",
    status: "new",
    createdBy: soldby,
    _id: await generateUID(),
    createdFor: accountId,
    createdAt: new Date(),
    type: "counterOffer",
  };
  let insert_obj = {
    _id: new_id,
    productSlug: product && product.product ? product.product.slug : null,
    productId: decodeProductId,
    variantId: decodeVariantId,
    reactionVariantId: variantId,
    reactionProductId: productId,
    shopId: decodeShopId,
    createdBy: accountId,
    createdAt: new Date(),
    updatedAt: new Date(),
    offerBy: accountId,
    canAccept: soldby,
    activeOffer: offer_obj,
    buyerOffer: offer_obj,
    sellerOffer: offer_seller,
    status: "new",
    soldBy: soldby,
    offers: [
      {
        ...offer,
        createdBy: accountId,
        _id: await generateUID(),
        createdFor: soldby,
        createdAt: new Date(),
        type: offerType,
      },
    ],
  };
  let BidsAdded = await Bids.insertOne(insert_obj);
  if (BidsAdded.insertedId) {
    if (!contactExists) {
      console.log("new ", contactExists);

      pubSub.publish(`newBids ${soldby}`, { newBid: insert_obj });
    } else {
      // if (
      //   contactExists.productId != decodeProductId &&
      //   contactExists.variantId != decodeVariantId
      // ) {
      //   pubSub.publish(`newBids ${soldby}`, { newBid: insert_obj });
      // }
      console.log("contactExists", contactExists);
    }
    console.log("product for bid", product);
    const sellerBidMessage = `You have received a new bid of ${offer.amount.amount} on ${product.product.title}`;
    const sellerId = insert_obj.soldBy;
    await sendMessage(context, sellerId, sellerBidMessage, null)
    createNotification(context, {
      details: null,
      from: accountId,
      hasDetails: false,
      message: `Placed a bid of ${offer.amount.amount} on ${product.product.title}`,
      status: "unread",
      to: soldby,
      type: "bid",
      url: `/en/chat?bidId=${BidsAdded.insertedId}`,
    });

    return BidsAdded.insertedId;
    // return Bids.findOne({"_id":BidsAdded.insertedId});
  } else {
    throw new Error("Something went wrong");
  }
  // return BidsAdded.insertedId;
  // return Products.find(selector).toArray();
}
