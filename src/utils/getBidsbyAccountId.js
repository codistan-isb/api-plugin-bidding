import generateUID from "./generateUID.js";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
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
export default async function getBidsbyAccountId(context, args) {
  const { collections } = context;
  const { Bids } = collections;
  const { shopId, productId, offer, variantId, soldby } = args;
  let accountId = context.userId;

  console.log("HIT THE QUERY GET BIDS BY ACCOUNT ID")
  //  let bids= await Bids.find({$or: [{"createdBy":accountId},{"soldBy":accountId}]}).sort({"updatedAt":-1}).limit(1).toArray();
    let bids = await Bids.aggregate([{ $match: { $or: [{ "createdBy": accountId }, { "soldBy": accountId }] } }, { $group: { _id: { createdBy: "$createdBy", soldBy: "$soldBy" }, data: { $push: "$$ROOT" } } }]).toArray()
  let contacts = [];
  if (bids) {
    bids.map(bid => {
      contacts.push(bid.data[0])
    })
  }
  console.log("ctl", contacts.length)
  return contacts;
}
