import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";
import encodeOpaqueId from "@reactioncommerce/api-utils/encodeOpaqueId.js";

/**
 * @method getRecentOffer
 * @summary Get recent offers for a specific product and variant
 * @param {Object} context - an object containing the per-request state
 * @param {Object} args - an object of all arguments that were sent by the client
 * @param {String} args.productId - Product ID
 * @param {String} args.variantId - Variant ID
 * @param {Number} args.first - Number of items to return (default: 20)
 * @param {String} args.after - Cursor for pagination
 * @returns {Promise<Object>} Object containing offers array and pagination info
 */
export default async function getRecentOffer(context, args) {
  const { collections } = context;
  const { Bids } = collections;
  const { productId, variantId, first = 20, after } = args;

  if (!productId || !variantId) {
    throw new Error("Product ID and Variant ID are required");
  }

  let query = {
    reactionProductId: productId,
    reactionVariantId: variantId,
  };

  if (after) {
    try {
      const decodedCursor = decodeOpaqueId(after);
      query._id = { $gt: decodedCursor };
    } catch (error) {
      console.error("Invalid cursor:", error);
      throw new Error("Invalid cursor");
    }
  }

  const totalCount = await Bids.countDocuments(query);

  let bids = await Bids.find(query)
    .sort({ updatedAt: -1 })
    .limit(first + 1)
    .toArray();

  const hasNextPage = bids.length > first;
  if (hasNextPage) {
    bids = bids.slice(0, first);
  }

  const processedBids = bids.map((bid) => {
    return {
      ...bid,
    };
  });

  const pageInfo = {
    hasNextPage,
    hasPreviousPage: !!after,
    startCursor:
      processedBids.length > 0
        ? encodeOpaqueId("reaction/bid", processedBids[0]._id)
        : null,
    endCursor:
      processedBids.length > 0
        ? encodeOpaqueId(
            "reaction/bid",
            processedBids[processedBids.length - 1]._id
          )
        : null,
  };

  return {
    bids: processedBids,
    pageInfo,
    totalCount,
  };
}
