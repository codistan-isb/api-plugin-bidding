import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";

/**
 *
 * @method getActiveBids
 * @summary Get all of a Unit's Variants or only a Unit's top level Variants.
 * @param {Object} context - an object containing the per-request state
 * @param {String} unitOrVariantId - A Unit or top level Unit Variant ID.
 * @param {Boolean} topOnly - True to return only a units top level variants.
 * @param {Object} args - an object of all arguments that were sent by the client
 * @param {Boolean} args.shouldIncludeHidden - Include hidden units in results
 * @param {Boolean} args.shouldIncludeArchived - Include archived units in results
 * @returns {Promise<Object[]>} Array of Unit Variant objects.
 */
export default async function getActiveBids(context, args) {
  const { collections } = context;
  const { productId, variantId } = args;
  const { Bids } = collections;
  let accountId = context.userId;

  let decodeProductId = decodeOpaqueId(productId).id;
  let decodeVariantId = decodeOpaqueId(variantId).id;
  if (decodeProductId == productId || productId.length == 0) {
    throw new Error("ProductId must be a Reaction ID");
  }
  if (decodeVariantId == variantId || variantId.length == 0) {
    throw new Error("variantId must be a Reaction ID");
  }
  console.log("accountId", accountId)
  let bids_active = await Bids.findOne({
    createdBy: accountId,
    productId: decodeProductId,
    variantId: decodeVariantId
  });
  return bids_active;
}
