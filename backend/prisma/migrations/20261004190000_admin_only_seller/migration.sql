DO $$
DECLARE
    admin_user_id TEXT;
    admin_seller_id TEXT;
BEGIN
    SELECT "id"
    INTO admin_user_id
    FROM "users"
    WHERE LOWER("userType") = 'admin' AND "isActive" = TRUE
    ORDER BY "createdAt" ASC
    LIMIT 1;

    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Cannot consolidate sellers: no active admin account exists';
    END IF;

    INSERT INTO "sellers" (
        "id",
        "userId",
        "shopName",
        "shopDescription",
        "commissionRate",
        "isApproved",
        "isVerified",
        "totalRevenue",
        "createdAt",
        "updatedAt"
    )
    VALUES (
        'admin-store-' || admin_user_id,
        admin_user_id,
        'Wise Accessories Store',
        'Official Wise Accessories store',
        0,
        TRUE,
        TRUE,
        0,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT ("userId") DO UPDATE SET
        "shopName" = EXCLUDED."shopName",
        "shopDescription" = EXCLUDED."shopDescription",
        "commissionRate" = 0,
        "isApproved" = TRUE,
        "isVerified" = TRUE,
        "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "id" INTO admin_seller_id;

    UPDATE "products"
    SET "sellerId" = admin_seller_id
    WHERE "sellerId" <> admin_seller_id;

    UPDATE "users"
    SET "isActive" = FALSE, "updatedAt" = CURRENT_TIMESTAMP
    WHERE LOWER("userType") = 'seller' AND "isActive" = TRUE;
END $$;
