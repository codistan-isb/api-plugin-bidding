import generateUID from "./generateUID.js";
import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
import encodeOpaqueId from "@reactioncommerce/api-utils/encodeOpaqueId.js";
/**
 *
 * @method getBidsbySellerId
 * @summary Get all of a Unit's Variants or only a Unit's top level Variants.
 * @param {Object} context - an object containing the per-request state
 * @param {String} unitOrVariantId - A Unit or top level Unit Variant ID.
 * @param {Boolean} topOnly - True to return only a units top level variants.
 * @param {Object} args - an object of all arguments that were sent by the client
 * @param {Boolean} args.shouldIncludeHidden - Include hidden units in results
 * @param {Boolean} args.shouldIncludeArchived - Include archived units in results
 * @param {Number} args.first - Number of items to return
 * @param {String} args.after - Cursor for pagination
 * @returns {Promise<Object>} Object containing bids array and pagination info
 */
export default async function getBidsbySellerId(context, args) {
  const { collections } = context;
  const { Bids } = collections;
  const { first = 20, after } = args;
  let accountId = context.userId;
  console.log("accountId", accountId);

  let query = { soldBy: accountId };

  if (after) {
    try {
      const decodedCursor = decodeOpaqueId(after);
      query._id = { $gt: decodedCursor };
    } catch (error) {
      console.error("Invalid cursor:", error);
      throw new Error("Invalid cursor");
    }
  }

  const totalCount = await Bids.countDocuments({ soldBy: accountId });

  let bids = await Bids.find(query)
    .sort({ updatedAt: -1 })
    .limit(first + 1)
    .toArray();

  const hasNextPage = bids.length > first;
  if (hasNextPage) {
    bids = bids.slice(0, first);
  }

  const pageInfo = {
    hasNextPage,
    hasPreviousPage: !!after,
    startCursor:
      bids.length > 0 ? encodeOpaqueId("reaction/bid", bids[0]._id) : null,
    endCursor:
      bids.length > 0
        ? encodeOpaqueId("reaction/bid", bids[bids.length - 1]._id)
        : null,
  };

  return {
    bids,
    pageInfo,
    totalCount,
  };
}
