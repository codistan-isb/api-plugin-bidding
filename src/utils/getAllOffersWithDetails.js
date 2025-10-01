import decodeOpaqueId from "@reactioncommerce/api-utils/decodeOpaqueId.js";

/**
 * @method getAllOffersWithDetails
 * @summary Get all offers with complete product and user details
 * @param {Object} context - an object containing the per-request state
 * @param {Object} args - query arguments
 * @param {Number} args.first - Number of items to return
 * @param {String} args.after - Cursor for pagination
 * @param {String} args.status - Filter by bid status
 * @param {String} args.productId - Filter by product ID
 * @param {String} args.userId - Filter by user ID
 * @returns {Promise<Object>} Paginated offers with details
 */
export default async function getAllOffersWithDetails(context, args) {
  const { collections } = context;
  const { Bids, Catalog, Accounts } = collections;
  const { first = 20, after, status, productId, userId } = args;

  console.log("getAllOffersWithDetails called with args:", args);

  // Build query filter
  const query = {};

  if (status) {
    query.status = status;
  }

  if (productId) {
    try {
      const decodedProductId = decodeOpaqueId(productId).id;
      query.productId = decodedProductId;
    } catch (error) {
      console.log("Invalid productId format, using as is:", productId);
      query.productId = productId;
    }
  }

  if (userId) {
    query.$or = [{ createdBy: userId }, { soldBy: userId }];
  }

  console.log("Query filter:", query);

  // Calculate skip for pagination
  const skip = after ? parseInt(Buffer.from(after, "base64").toString()) : 0;

  try {
    // Get total count
    const totalCount = await Bids.countDocuments(query);
    console.log("Total count:", totalCount);

    // Get bids with pagination
    const bids = await Bids.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(first)
      .toArray();

    console.log("Found bids:", bids.length);

    // Process each bid to get complete details
    const detailedOffers = await Promise.all(
      bids.map(async (bid) => {
        try {
          // Get product details from Catalog
          let productDetails = null;
          try {
            const catalogProduct = await Catalog.findOne({
              "product.productId": bid.productId,
            });

            if (catalogProduct && catalogProduct.product) {
              productDetails = {
                _id: catalogProduct._id,
                productId: catalogProduct.product.productId,
                title: catalogProduct.product.title,
                slug: catalogProduct.product.slug,
                description: catalogProduct.product.description || "",
                type: catalogProduct.product.type,
                isVisible: catalogProduct.product.isVisible,
                isDeleted: catalogProduct.product.isDeleted,
                createdAt: catalogProduct.product.createdAt,
                updatedAt: catalogProduct.product.updatedAt,
                shopId: catalogProduct.product.shopId,
                vendor: catalogProduct.product.vendor || "",
                originCountry: catalogProduct.product.originCountry || "",
                sku: catalogProduct.product.sku || "",
                barcode: catalogProduct.product.barcode || "",
                pageTitle: catalogProduct.product.pageTitle || "",
                metaDescription: catalogProduct.product.metaDescription || "",
                weight: catalogProduct.product.weight || 0,
                length: catalogProduct.product.length || 0,
                width: catalogProduct.product.width || 0,
                height: catalogProduct.product.height || 0,
                primaryImage: catalogProduct.product.primaryImage || null,
                media: catalogProduct.product.media || [],
                pricing: catalogProduct.product.pricing || {},
                isBackorder: catalogProduct.product.isBackorder || false,
                isLowQuantity: catalogProduct.product.isLowQuantity || false,
                isSoldOut: catalogProduct.product.isSoldOut || false,
                metafields: catalogProduct.product.metafields || [],
                variants: catalogProduct.product.variants || [],
                tagIds: catalogProduct.product.tagIds || [],
                socialMetadata: catalogProduct.product.socialMetadata || [],
                supportedFulfillmentTypes:
                  catalogProduct.product.supportedFulfillmentTypes || [],
              };
            }
          } catch (error) {
            console.log("Error fetching product details:", error.message);
          }

          // Get buyer details
          let buyerDetails = null;
          try {
            const buyerAccount = await Accounts.findOne({
              userId: bid.createdBy,
            });
            if (buyerAccount) {
              buyerDetails = {
                _id: buyerAccount._id,
                userId: buyerAccount.userId,
                name: buyerAccount.name || "",
                username: buyerAccount.username || "",
                email: buyerAccount.emails?.[0]?.address || "",
                profile: {
                  name: buyerAccount.profile?.name || "",
                  picture: buyerAccount.profile?.picture || "",
                  username: buyerAccount.profile?.username || "",
                  identityVerified:
                    buyerAccount.profile?.identityVerified || false,
                },
                storeName: buyerAccount.storeName || "",
                storeLogo: buyerAccount.storeLogo || "",
                bio: buyerAccount.bio || "",
                roles: buyerAccount.roles || "",
                total_spent: buyerAccount.total_spent || 0,
                billing: buyerAccount.billing || {},
                shipping: buyerAccount.shipping || {},
                createdAt: buyerAccount.createdAt || new Date(),
                updatedAt: buyerAccount.updatedAt || new Date(),
                shopId: buyerAccount.shopId || "",
                state: buyerAccount.state || "",
                acceptsMarketing: buyerAccount.acceptsMarketing || "",
                wp_user_id: buyerAccount.wp_user_id || "",
              };
            }
          } catch (error) {
            console.log("Error fetching buyer details:", error.message);
          }

          // Get seller details
          let sellerDetails = null;
          try {
            const sellerAccount = await Accounts.findOne({
              userId: bid.soldBy,
            });
            if (sellerAccount) {
              sellerDetails = {
                _id: sellerAccount._id,
                userId: sellerAccount.userId,
                name: sellerAccount.name || "",
                username: sellerAccount.username || "",
                email: sellerAccount.emails?.[0]?.address || "",
                profile: {
                  name: sellerAccount.profile?.name || "",
                  picture: sellerAccount.profile?.picture || "",
                  username: sellerAccount.profile?.username || "",
                  identityVerified:
                    sellerAccount.profile?.identityVerified || false,
                },
                storeName: sellerAccount.storeName || "",
                storeLogo: sellerAccount.storeLogo || "",
                bio: sellerAccount.bio || "",
                roles: sellerAccount.roles || "",
                total_spent: sellerAccount.total_spent || 0,
                billing: sellerAccount.billing || {},
                shipping: sellerAccount.shipping || {},
                createdAt: sellerAccount.createdAt || new Date(),
                updatedAt: sellerAccount.updatedAt || new Date(),
                shopId: sellerAccount.shopId || "",
                state: sellerAccount.state || "",
                acceptsMarketing: sellerAccount.acceptsMarketing || "",
                wp_user_id: sellerAccount.wp_user_id || "",
              };
            }
          } catch (error) {
            console.log("Error fetching seller details:", error.message);
          }

          // Process offers array to include user details
          const processedOffers = await Promise.all(
            (bid.offers || []).map(async (offer) => {
              let senderDetails = null;
              let receiverDetails = null;

              try {
                // Get sender details
                const senderAccount = await Accounts.findOne({
                  userId: offer.createdBy,
                });
                if (senderAccount) {
                  senderDetails = {
                    name: senderAccount.name || "",
                    username: senderAccount.username || "",
                    picture: senderAccount.profile?.picture || "",
                    userId: senderAccount.userId,
                  };
                }

                // Get receiver details
                const receiverAccount = await Accounts.findOne({
                  userId: offer.createdFor,
                });
                if (receiverAccount) {
                  receiverDetails = {
                    name: receiverAccount.name || "",
                    username: receiverAccount.username || "",
                    picture: receiverAccount.profile?.picture || "",
                    userId: receiverAccount.userId,
                  };
                }
              } catch (error) {
                console.log(
                  "Error fetching offer user details:",
                  error.message
                );
              }

              return {
                ...offer,
                sender: senderDetails,
                reciever: receiverDetails,
              };
            })
          );

          return {
            _id: bid._id,
            productId: bid.productId,
            variantId: bid.variantId,
            productSlug: bid.productSlug || "",
            reactionVariantId: bid.reactionVariantId,
            reactionProductId: bid.reactionProductId,
            shopId: bid.shopId,
            createdBy: bid.createdBy,
            soldBy: bid.soldBy,
            status: bid.status || "",
            createdAt: bid.createdAt,
            updatedAt: bid.updatedAt,
            product: productDetails,
            buyer: buyerDetails,
            seller: sellerDetails,
            activeOffer: bid.activeOffer || null,
            buyerOffer: bid.buyerOffer || null,
            sellerOffer: bid.sellerOffer || null,
            acceptedOffer: bid.acceptedOffer || null,
            offers: processedOffers,
            gameCanAccept: bid.gameCanAccept || null,
            acceptedGame: bid.acceptedGame || null,
            gameAcceptedAt: bid.gameAcceptedAt || null,
            gameAcceptedBy: bid.gameAcceptedBy || null,
            wonBy: bid.wonBy || null,
            lostBy: bid.lostBy || null,
            acceptAction: bid.acceptAction || null,
            acceptedBy: bid.acceptedBy || null,
          };
        } catch (error) {
          console.log("Error processing bid:", bid._id, error.message);
          return null;
        }
      })
    );

    // Filter out null results
    const validOffers = detailedOffers.filter((offer) => offer !== null);

    // Calculate pagination info
    const hasNextPage = skip + first < totalCount;
    const hasPreviousPage = skip > 0;
    const endCursor = hasNextPage
      ? Buffer.from((skip + first).toString()).toString("base64")
      : null;
    const startCursor = hasPreviousPage
      ? Buffer.from(skip.toString()).toString("base64")
      : null;

    return {
      offers: validOffers,
      pageInfo: {
        hasNextPage,
        hasPreviousPage,
        startCursor,
        endCursor,
      },
      totalCount,
    };
  } catch (error) {
    console.error("Error in getAllOffersWithDetails:", error);
    throw new Error("Failed to fetch offers with details");
  }
}
